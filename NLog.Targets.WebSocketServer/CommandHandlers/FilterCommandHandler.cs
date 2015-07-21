using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace NLog.Targets.WebSocketServer.CommandHandlers
{
    public sealed class FilterCommandHandler : ICommandHandler
    {
        public Boolean CanHandle(String commandName)
        {
            return String.Equals("filter", commandName, StringComparison.OrdinalIgnoreCase);
        }

        public void Handle(JObject command, IWebSocketWrapper wswrapper)
        {
            var expression = command.Property("filter");
            if (expression == null || expression.Value == null)
                return;
            wswrapper.Expression = new Regex(expression.Value.ToString());
        }
    }
}
