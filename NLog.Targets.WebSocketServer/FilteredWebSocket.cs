using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using vtortola.WebSockets;

namespace NLog.Targets.WebSocketServer
{
    internal sealed class FilteredWebSocket
    {
        public WebSocket WebSocket { get; private set; }
        public Regex Expression { get; set; }

        public FilteredWebSocket(WebSocket webSocket)
        {
            WebSocket = webSocket;
        }
    }
}
