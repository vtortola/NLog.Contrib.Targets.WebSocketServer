using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using vtortola.WebSockets;

namespace NLog.Targets.WebSocketServer
{
    public interface IWebSocketWrapper
    {
        WebSocket WebSocket { get; }
        Regex Expression { get; set; }
    }
    public sealed class WebSocketWrapper : IWebSocketWrapper
    {
        public WebSocket WebSocket { get; private set; }
        public Regex Expression { get; set; }

        public WebSocketWrapper(WebSocket webSocket)
        {
            WebSocket = webSocket;
        }
    }
}
