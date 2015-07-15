# NLog.Targets.WebSocketServer

NLog target that setups a standalone WebSocket server and broadcasts the log entries.

Checkout this example of a log viewer done in AngularJS. 

## Installation

## Configuration

### NuGet

### Manually
Just drop the following libraries in your bin folder:
 * vv

```xml
  <nlog>
    <!-- This part is only required fro NLog versions < 4.0  -->
    <extensions>
      <add assembly="NLog.WebsocketServer"/>
    </extensions>
    
    <targets>
      <target type="Console" name="consolelog" />
      <target name="logfile" type="File" fileName="file.txt" />
      
      <!-- Configuration for NLog.Targets.WebSocketServer -->
      <target name="websocket" type="WebSocket" port="9001"/>
    </targets>
    <rules>
      <logger name="*" minlevel="Trace" writeTo="logfile, websocket, consolelog" />
    </rules>
  </nlog>
```

### Links
 * [Extending NLog](//github.com/nlog/nlog/wiki/Extending%20NLog)
 * [WebSocketListener](//vtortola.github.io/WebSocketListener/)
