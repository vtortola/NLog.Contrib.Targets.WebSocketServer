using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NLog.Targets.WebSocketServer.CommandHandlers;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Threading.Tasks.Dataflow;
using vtortola.WebSockets;

namespace NLog.Targets.WebSocketServer
{

    public sealed class LogEntryDistributor : IDisposable
    {
        readonly BufferBlock<LogEntry> _block;
        readonly CancellationTokenSource _cancel;
        readonly ReaderWriterLockSlim _semaphore;
        readonly WebSocketListener _listener;
        readonly List<WebSocketWrapper> _connections;
        readonly JsonSerializer _serializer;
        readonly String _ipAddressStart;
        readonly Int32 _maxConnectedClients;

        readonly ICommandHandler[] _commandHandlers;

        Int32 _disposed;

        public LogEntryDistributor(Int32 port, String ipAddressStart, Int32 maxConnectedClients, TimeSpan clientTimeout)
        {
            _maxConnectedClients = maxConnectedClients;
            _ipAddressStart = ipAddressStart;
            _listener = new WebSocketListener(new IPEndPoint(IPAddress.Any, port), new WebSocketListenerOptions
            {
                PingTimeout = clientTimeout
            });
            _listener.Standards.RegisterStandard(new vtortola.WebSockets.Rfc6455.WebSocketFactoryRfc6455());
            _cancel = new CancellationTokenSource();
            _block = new BufferBlock<LogEntry>(new DataflowBlockOptions() { CancellationToken = _cancel.Token });
            _connections = new List<WebSocketWrapper>();
            _serializer = new JsonSerializer();
            _semaphore = new ReaderWriterLockSlim(LockRecursionPolicy.NoRecursion);

            _commandHandlers = new[] { new FilterCommandHandler() };

            _listener.Start();
            Task.Run((Func<Task>)AcceptConnections);
            Task.Run((Func<Task>)ReceiveAndBroadcast);
        }

        private async Task AcceptConnections()
        {
            while (_listener.IsStarted && !_cancel.IsCancellationRequested)
            {
                var con = await _listener.AcceptWebSocketAsync(_cancel.Token).ConfigureAwait(false);

                if (!CanAcceptConnection(con))
                {
                    DisconnectWebSocket(con);
                    continue;
                }

                if (!TryAddWebSocketToPool(con))
                    DisconnectWebSocket(con);
            }
        }

        private bool CanAcceptConnection(WebSocket con)
        {
            if (String.IsNullOrEmpty(_ipAddressStart))
                return true;

            if (IPAddress.IsLoopback(con.RemoteEndpoint.Address))
                return true;

            return con.RemoteEndpoint.Address.ToString().StartsWith(_ipAddressStart);
        }

        private Boolean TryAddWebSocketToPool(WebSocket con)
        {
            try
            {
                _semaphore.EnterWriteLock();

                if (_connections.Count >= _maxConnectedClients)
                   return false;

                var ws = new WebSocketWrapper(con);
                _connections.Add(ws);
                Task.Run(() => AcceptWebSocketCommands(ws));
                return true;
            }
            finally
            {
                _semaphore.ExitWriteLock();
            } 
        }

        private static void DisconnectWebSocket(WebSocket con)
        {
            Task.Run(() => con.Dispose());
        }
              
        private async Task ReceiveAndBroadcast()
        {
            while (!_cancel.IsCancellationRequested)
            {
                var message = await _block.ReceiveAsync(_cancel.Token).ConfigureAwait(false);
                RemoveDisconnected();
                ParallelBroadcastLogEntry(message);
            }
        }

        private Int64 GetTimestamp(DateTime dateTime)
        {
            return Int64.Parse(dateTime.ToString("yyyyMMddHHmmssff"));
        }

        public void Broadcast(String logline, DateTime timestamp)
        {
            if (_listener.IsStarted && !_cancel.IsCancellationRequested)
            {
                _block.Post(new LogEntry(GetTimestamp(timestamp), logline));
            }
        }

        private void ParallelBroadcastLogEntry(LogEntry logEntry)
        {
            try
            {
                _semaphore.EnterReadLock();
                Parallel.ForEach(
                    source: _connections,
                    parallelOptions: new ParallelOptions()
                    {
                        CancellationToken = _cancel.Token,
                        MaxDegreeOfParallelism = Environment.ProcessorCount * 2
                    },
                    body: ws => SendLogEntry(ws, logEntry));
            }
            finally
            {
                _semaphore.ExitReadLock();
            }
        }

        private void SendLogEntry(WebSocketWrapper ws, LogEntry logEntry)
        {
            try
            {
                if (!ws.WebSocket.IsConnected)
                    return;

                if (ws.Expression != null && !ws.Expression.IsMatch(logEntry.Line))
                    return;

                using (var wsmsg = ws.WebSocket.CreateMessageWriter(WebSocketMessageType.Text))
                using (var writer = new StreamWriter(wsmsg, Encoding.UTF8, 1024, true))
                {
                    _serializer.Serialize(writer, logEntry);
                }
            }
            catch
            {
                DisconnectWebSocket(ws.WebSocket);
            }
        }

        private async Task AcceptWebSocketCommands(WebSocketWrapper ws)
        {
            while (ws.WebSocket.IsConnected && !_cancel.IsCancellationRequested)
            {
                try
                {
                    var message = await ws.WebSocket.ReadStringAsync(_cancel.Token).ConfigureAwait(false);

                    if (message == null) // server shutting down
                        continue; 

                    var json = JObject.Parse(message);
                    var command = json.Property("command");

                    if (command == null || command.Value == null)
                        continue;

                    HandleCommand(command.Value.ToString(), json, ws);
                }
                catch
                {
                    DisconnectWebSocket(ws.WebSocket);
                }
            }
        }

        private void HandleCommand(String commandName, JObject json, WebSocketWrapper wsWrapper)
        {
            try
            {
                foreach (var handler in _commandHandlers.Where(h=> h.CanHandle(commandName)))
                {
                    handler.Handle(json, wsWrapper);
                }
            }
            catch(Exception)
            {
            }
        }

        private void RemoveDisconnected()
        {
            try
            {
                _semaphore.EnterUpgradeableReadLock();

                var disconnected = _connections.Where(c => !c.WebSocket.IsConnected).ToList();
                if (!disconnected.Any())
                    return;

                RemoveDisconnected(disconnected);
            }
            finally
            {
                _semaphore.ExitUpgradeableReadLock();
            }
        }

        private void RemoveDisconnected(List<WebSocketWrapper> disconnected)
        {
            try
            {
                _semaphore.EnterWriteLock();
                foreach (var d in disconnected)
                {
                    _connections.Remove(d);
                    d.WebSocket.Dispose();
                }
            }
            finally
            {
                _semaphore.ExitWriteLock();
            }
        }

        private void Dispose(Boolean disposing)
        {
            if (Interlocked.CompareExchange(ref _disposed, 1, 0) == 1)
                return;

            if(disposing)
                GC.SuppressFinalize(this);

            _cancel.Cancel();
            _semaphore.Dispose();
            _listener.Dispose();
        }

        public void Dispose()
        {
            Dispose(true);
        }

        ~LogEntryDistributor()
        {
            Dispose(false);
        }
    }

}
