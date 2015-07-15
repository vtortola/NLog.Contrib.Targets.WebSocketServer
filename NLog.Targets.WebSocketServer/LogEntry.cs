using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NLog.Targets.WebSocketServer
{
    internal sealed class LogEntry
    {
        public Int64 Timestamp { get; private set; }
        public String Line { get; private set; }

        public LogEntry(Int64 timestamp, String logLine)
        {
            Timestamp = timestamp;
            Line = logLine;
        }
    }
}
