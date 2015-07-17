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
        Boolean _enabled;

        [RequiredParameter]
        public Int32 Port { get; set; }

        public String IPAddressStartsWith { get; set; }

        public Boolean ThrowExceptionIfSetupFails { get; set; }

        public Int32 MaxConnectedClients { get; set; }

        public TimeSpan ClientTimeOut { get; set; }

        public WebSocketServerTarget()
        {
            MaxConnectedClients = 100;
            ClientTimeOut = TimeSpan.FromSeconds(5);
        }

        protected override void InitializeTarget()
        {
            try
            {
                _distributor = new LogEntryDistributor(Port, IPAddressStartsWith);
                _enabled = true;
            }
            catch(Exception)
            {
                _enabled = false;
                if (ThrowExceptionIfSetupFails)
                    throw;
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (!_enabled)
                return;

            _distributor.Dispose();
            base.Dispose(disposing);
        }
        protected override void Write(LogEventInfo logEvent)
        {
            if (!_enabled)
                return;
            try
            {
                _distributor.Publish(this.Layout.Render(logEvent), logEvent.TimeStamp);
            }
            catch
            {
                // Swallow exceptions during writting
            }
        }
    }
}
