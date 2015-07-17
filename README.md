# NLog.Targets.WebSocketServer

Allows to broadcast your servers´ logs to websocket connections in real-time with minimal effort. Subscribe to a regular expressions to remove undesired lines. Simplifies log monitoring, allowing that a simple web browser to watch over multiple servers´ logs interpolating the lines by timestamp.

NLog.Targets.WebSocketServer is a [NLog target](https://github.com/nlog/nlog/wiki/Targets) that instead of writing on a file, or showing the log on the console, broadcast the log entries through websockets.

Features:
 * **Fully integrated with NLog**: it does not require changes in your application.
 * **Self-hosted**: it does not need IIS or any hosting framework.
 * **Mono compatible**: Both NLog and WebSocketListener are compatible with Mono.
 * **Subscribe to Regular Expressions**: Is it possible to send a message throug the WebSocket connection to indicate the expression to which you want to subscribe. Only log entries matching that regex will be sent.
 * **Scalable**: It uses an asynchronous WebSocket server. 
 
Checkout this example of a log viewer done in AngularJS. 

## Installation

### NuGet
```
comming soon...
```

### Manually
Just drop the following libraries in your bin folder:
 * NLog.Targets.WebsocketServer
 * vtortola.WebSocketListener
 * vtortola.WebSocketListener.Rfc6455
 * Newtonsoft.Json
 * System.Threading.Tasks.Dataflow

## Configuration
Configure `NLog.Targets.WebsocketServer` as a new target.
#### Required configuration parameters:
 * `port`: Indicates in which connection will the WebSocket server listen for new connections.

#### Optional configuation parameters:
 * `IPAddressStartsWith`: Indicates how the client IP address must start to be accepted. Loopback interface is always accepted. A example value would be `192.168.`. An empty string means that all connections are accepted.
 * `ThrowExceptionIfSetupFails`: By default `NLog.Targets.WebSocketServerTarget` will fail silently if does not succeed trying to set up the websocket server (e.g.: because the port is already in use), and it will be automatically disabled. In production you may not want the application to crash because one of your targets failed, but during development you would like to get an exception indicatig the issue. 

```xml
  <nlog>
    <!-- This part is only required for NLog versions < 4.0  -->
    <extensions>
      <add assembly="NLog.Targets.WebsocketServer"/>
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

## Output
The WebSocket server broadcast JSON objects like this:
```json
{
   "Timestamp":2015071602553825,
   "Line":"2015-07-16 21:55:38.2576|INFO||This is information."
}
```
 * `Timestamp`: Is the server date and time in `yyyyMMddHHmmssff` format.
 * `Line` : The actual formated log entry.

## Input
The component accepts JSON commands to request special behaviours.

#### Filter by Regular Expression
Instructs the component to only send the lines that match a give Regular Expression. Send an empty or null expression to reset it.
```json
{
   "command":"filter",
   "filter": <RegEx>
}
```





### Links
 * [Extending NLog](//github.com/nlog/nlog/wiki/Extending%20NLog)
 * [WebSocketListener](//vtortola.github.io/WebSocketListener/)
