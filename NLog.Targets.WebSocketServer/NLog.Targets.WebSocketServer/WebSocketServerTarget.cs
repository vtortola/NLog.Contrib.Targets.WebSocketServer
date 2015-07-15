using NLog.Config;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NLog.Targets.WebSocketServer
{
    [Target("NLog.Targets.WebSocketServer")]
    public sealed class WebSocketServerTarget : TargetWithLayout
    {
        LogEntryDistributor _distributor;

        [RequiredParameter]
        public Int32 Port { get; set; }

        public String IPAddressStartsWith { get; set; }
        
        protected override void InitializeTarget()
        {
            _distributor = new LogEntryDistributor(Port, IPAddressStartsWith);
            base.InitializeTarget();
        }

        protected override void Dispose(bool disposing)
        {
            _distributor.Dispose();
            base.Dispose(disposing);
        }
        protected override void Write(LogEventInfo logEvent)
        {
            _distributor.Publish(this.Layout.Render(logEvent), logEvent.TimeStamp);
            base.Write(logEvent);
        }
    }
}
