# NLog.Contrib.Targets.WebSocketServer

Broadcast your servers´ logs to websocket connections in real-time with minimal effort. Subscribe to a regular expressions to remove undesired lines. Simplifies log monitoring, allowing that a simple web browser to watch over multiple servers´ logs interpolating the lines by timestamp. Not a replacement of a proper monitoring tool, but handy for watching over logs with little logistic effort.

NLog.Contrib.Targets.WebSocketServer is a [NLog target](https://github.com/nlog/nlog/wiki/Targets) that instead of writing on a file, or showing the log on the console, broadcast the log entries to the connected websocket connections.

Features:
 * **Fully integrated with NLog**: it does not require changes in your application code beyond the configuration.
 * **Self-hosted**: it does not need IIS or any hosting framework, [WebSocketListener](http://vtortola.github.io/WebSocketListener/) is socket based.
 * **Mono compatible**: Both NLog and WebSocketListener are compatible with Mono.
 * **Subscribe to Regular Expressions**: Is it possible to send a message throug the WebSocket connection to indicate the expression to which you want to subscribe. Only log entries matching that regex will be sent.
 * **Scalable**: NLog and WebSocketListener components are decoupled by a [producer-consumer pattern](http://www.ni.com/white-paper/3023/en/), so NLog will append the log entries to `WebSocketServerTarget` in `O(1)` time always, and another thread/threads are responsible of distributing that log entry to the clients. Still, if the component has a big number of connected clients, it may interfere with your application performance. See the `MaxConnectedClients` configuration setting. The queue is configured to have a bounding capacity of 1000 items, if the queue gets full, items will start to be discarded.
 
[Checkout this example of a log viewer done in AngularJS](//github.com/vtortola/NLog.Contrib.Targets.WebSocketServer/wiki/WebSocket-log-viewer-UI-example-with-AngularJS). 

![AngularJS Log viewer](http://vtortola.github.io/NLog.Contrib.Targets.WebSocketServer/screenshot.png)

## Installation

### NuGet
```
PM> Install-Package NLog.Contrib.Targets.WebSocketServer
```

## Configuration
Configure `NLog.Targets.WebsocketServer` as a new target.
#### Required configuration parameters:
 * `Port (Int32)` : Indicates in which connection will the WebSocket server listen for new connections.

#### Optional configuation parameters:
 * `IPAddressStartsWith (String)`: Indicates how the client IP address must start to be accepted. Loopback interface is always accepted. A example value would be `192.168.`. An empty string means that all connections are accepted.
 * `ThrowExceptionIfSetupFails (Boolean)`: By default `NLog.Targets.WebSocketServerTarget` will fail silently if does not succeed trying to set up the websocket server (e.g.: because the port is already in use), and it will be automatically disabled. In production you may not want the application to crash because one of your targets failed, but during development you would like to get an exception indicatig the issue. 
 * `MaxConnectedClients (Int32)`: The maximum number of allowed connections. By default 100.
 * `ClientTimeOut (TimeSpan)`: The amount of time without client [pong responses](https://tools.ietf.org/html/rfc6455#section-5.5.2). By default 10 seconds.

```xml
  <nlog>
    <!-- This part is only required for NLog versions < 4.0  -->
    <extensions>
      <add assembly="NLog.Contrib.Targets.WebsocketServer"/>
    </extensions>
    
    <targets>
      <target type="Console" name="consolelog" />
      <target name="logfile" type="File" fileName="file.txt" />
      
      <!-- Configuration for NLog.Targets.WebSocketServer -->
      <target name="websocket" type="NLog.Contrib.Targets.WebsocketServer" port="9001"/>
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
