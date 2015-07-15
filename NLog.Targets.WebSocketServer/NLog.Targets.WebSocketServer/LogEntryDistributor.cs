using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
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

    internal sealed class LogEntryDistributor : IDisposable
    {
        readonly BufferBlock<LogEntry> _block;
        readonly CancellationTokenSource _cancel;
        readonly WebSocketListener _listener;
        readonly ConcurrentDictionary<Guid, FilteredWebSocket> _connections;
        readonly JsonSerializer _serializer;
        readonly String _ipAddressStart;

        public LogEntryDistributor(Int32 port, String ipAddressStart)
        {
            _ipAddressStart = ipAddressStart;
            _listener = new WebSocketListener(new IPEndPoint(IPAddress.Any, port));
            _listener.Standards.RegisterStandard(new vtortola.WebSockets.Rfc6455.WebSocketFactoryRfc6455());
            _cancel = new CancellationTokenSource();
            _block = new BufferBlock<LogEntry>(new DataflowBlockOptions() { CancellationToken = _cancel.Token });
            _connections = new ConcurrentDictionary<Guid, FilteredWebSocket>();
            _serializer = new JsonSerializer();
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
                    Task.Run(()=> con.Dispose());
                    continue;
                }

                var ws = new FilteredWebSocket(con);
                Task.Run(() => AcceptWebSocketCommands(ws));
                _connections.TryAdd(Guid.NewGuid(), ws);
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

        private async Task AcceptWebSocketCommands(FilteredWebSocket wsWrapper)
        {
            while (wsWrapper.WebSocket.IsConnected && !_cancel.IsCancellationRequested)
            {
                var message = await wsWrapper.WebSocket.ReadStringAsync(_cancel.Token).ConfigureAwait(false);

                if (message == null)
                    continue;

                var json = JObject.Parse(message);
                var command = json.Property("command");
                if (command == null || command.Value == null)
                    continue;
                try
                {
                    switch (command.Value.ToString())
                    {
                        case "filter":
                            var expression = json.Property("filter");
                            if (expression == null || expression.Value == null)
                                continue;
                            wsWrapper.Expression = new Regex(expression.Value.ToString(), RegexOptions.Compiled);
                            break;
                    }
                }
                catch { }
            }
        }

        private async Task ReceiveAndBroadcast()
        {
            while (!_cancel.IsCancellationRequested)
            {
                var message = await _block.ReceiveAsync(_cancel.Token).ConfigureAwait(false);
                RemoveDisconnected();
                ParallelBroadcast(message);
            }
        }

        private void ParallelBroadcast(LogEntry logEntry)
        {
            Parallel.ForEach(_connections.Values, new ParallelOptions() { CancellationToken = _cancel.Token, MaxDegreeOfParallelism = 5 },
            con =>
            {
                try
                {
                    if (!con.WebSocket.IsConnected)
                        return;

                    if (con.Expression != null && !con.Expression.IsMatch(logEntry.Line))
                        return;

                    using (var wsmsg = con.WebSocket.CreateMessageWriter(WebSocketMessageType.Text))
                    using (var writer = new StreamWriter(wsmsg, Encoding.UTF8, 1024, true))
                    {
                        _serializer.Serialize(writer, logEntry);
                    }
                }
                catch
                {
                    con.WebSocket.Close();
                }
            });
        }

        private void RemoveDisconnected()
        {
            var disconnected = _connections.Where(c => !c.Value.WebSocket.IsConnected).Select(w => w.Key).ToList();
            FilteredWebSocket ws = null;

            if (!disconnected.Any())
                return;

            foreach (var d in disconnected)
            {
                _connections.TryRemove(d, out ws);
                ws.WebSocket.Dispose();
            }
        }

        internal void Publish(String logline, DateTime timestamp)
        {
            _block.Post(new LogEntry(Int64.Parse(timestamp.ToString("yyyyMMddhhmmssffff")), logline));
        }

        public void Dispose()
        {
            _cancel.Cancel();
            _listener.Dispose();
        }
    }

}
