# NLog.Targets.WebSocket

NLog target that setups a standalone WebSocket server and broadcasts the log entries.

## Installation

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

## Configuration

### Links
 * [Extending NLog](//github.com/nlog/nlog/wiki/Extending%20NLog)
 * [WebSocketListener](//vtortola.github.io/WebSocketListener/)
