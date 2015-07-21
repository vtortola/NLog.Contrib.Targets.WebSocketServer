angular.module("ng-websocket-log-viewer", [])

.factory('websocketLogViewerConstants', function () {
    return {
        commands: {
            connect: 'websocket-log-viewer-connect',
            filter: 'websocket-log-viewer-filter',
            highlight: 'websocket-log-viewer-highlight',
            lineCount: 'websocket-log-viewer-line-count',
            pause: 'websocket-log-viewer-pause'
        },
        events: {
            connected: 'websocket-log-viewer-connected',
            disconnected: 'websocket-log-viewer-disconnected',
            highlighted: 'websocket-log-viewer-highlight-match',
        }
    };
})


.controller('websocketLogViewerController', function ($scope, $sce, websocketLogViewerConstants) {

    $scope.loglines = [];
    var servers = [];
    var maxLines = 50;
    var lastTimespan = 0;
    var highlighted = {};
    var paused = false;
    var cache = [];

    $scope.$on(websocketLogViewerConstants.commands.connect, function (event, args) {
        connect(args, 0);
    });
        
    $scope.$on(websocketLogViewerConstants.commands.filter, function (event, args) {
        servers.forEach(function (server) {
            sendFilter(server, args.expression);
        });
    });

    $scope.$on(websocketLogViewerConstants.commands.highlight, function (event, args) {
        highlight(args);
    });
    
    $scope.$on(websocketLogViewerConstants.commands.lineCount, function (event, args) {
        var count = Number(args.count);
        if (!isNaN(count))
            maxLines = count;
    });

    $scope.$on(websocketLogViewerConstants.commands.pause, function (event) {
        pause();
    });

    var pause = function () {
        if (paused) {
            for (var i = 0; i < cache.length; i++) {
                pushEntryIntoScope(cache[i]);
            }
            cache = [];
            updateLogBoard();
        }
        paused = !paused;
    };

    var saveEntry = function (entry) {
        if (paused) {
            while (cache.length > maxLines)
                cache.shift()
            cache.push(entry);
        }
        else {
            pushEntryIntoScope(entry);
        }
    };

    var highlight = function (param) {
        if (param.text && param.text.length >= 2) {
            highlighted[param.id] = param;
        }
        else if (highlighted[param.id]) {
            delete highlighted[param.id];
        }
    };

    var pushEntryIntoScope = function (entry) {
        
        entry.HtmlLine = entry.Line;

        for (var id in highlighted) {
            var item = highlighted[id];

            if (!item.text || !item.class)
                continue;
      
            var isSomethingHighlighted = false;
            while(entry.HtmlLine.indexOf(item.text) != -1) {
                var text = item.text[0];
                text += "<span class='match-breaker'></span>";
                text += item.text.substr(1, item.text.length - 1);
                entry.HtmlLine = entry.HtmlLine.replace(item.text, "<span class='highlight " + item.class + "'>" + text + "</span>");
                isSomethingHighlighted = !item.silent;
            }

            if (isSomethingHighlighted)
                $scope.$emit(websocketLogViewerConstants.events.highlighted, { text: item.text, 'class': item.class, id:item.id });
        }
        entry.HtmlLine = $sce.trustAsHtml(entry.HtmlLine);
        $scope.loglines.push(entry);
        updateLogBoard();
    };

    var connect = function (parameters, retry) {
 
        var ws = new WebSocket(parameters.url);
        showMessage("Connecting to '" + parameters.url + "' ...", parameters.color);
        ws.onmessage = function (msg) {

            var entry = JSON.parse(msg.data);
            entry.color = parameters.color;
            saveEntry(entry);
            lastTimespan = entry.Timestamp;
        }
        servers.push(ws);

        ws.onopen = function () {
            showMessage("Connected to '" + parameters.url + "'.", parameters.color);
            if ($scope.filterExpression) {
                sendFilter(ws, $scope.filterExpression);
            }
            $scope.$emit(websocketLogViewerConstants.events.connected, { url: parameters.url, color: parameters.color });
        };

        ws.onclose = function () {
            connectionRetry(parameters, retry);
            $scope.$emit(websocketLogViewerConstants.events.disconnected, { url: parameters.url, color: parameters.color });
        };

        ws.onerror = function () {   
            showMessage("Error on '" + parameters.url + "' connection.", parameters.color);
        };
    };

    var updateLogBoard = function () {
        $scope.loglines.sort(logsorter);
        while ($scope.loglines.length > maxLines)
            $scope.loglines.shift()

        $scope.$$phase || $scope.$apply();
        window.scrollTo(0, document.body.scrollHeight);
    };

    var showMessage = function (line, color) {
        pushEntryIntoScope({
            Timestamp: lastTimespan++,
            Line: line,
            color: color
        });
    };

    var connectionRetry = function (parameters, retry) {

        if (retry > 10) {
            showMessage("Retried connection to '" + parameters.url + "' 10 times. Giving up.", parameters.color);
        } else {
            retry++;
            var seconds = 5 * retry;

            setTimeout(function () {
                connect(parameters, retry);
            }, seconds * 1000);
            showMessage("Disconnected from '" + parameters.url + "' " + retry + " times, retrying again in " + seconds + " seconds.", parameters.color);
        }
    };

    var sendFilter = function (server, expression) {
        server.send(JSON.stringify({
            command: "filter",
            filter: expression
        }));
    };

    var logsorter = function (a, b) {
        if (a.Timestamp < b.Timestamp)
            return -1;
        else if (a.Timestamp > b.Timestamp)
            return 1;
        else
            return 0;
    };
})

.directive('websocketLogViewer', function () {
    return {
        restrict: 'E',
        replace: true,
        template: '<div class="log-viewer"><div class="log-viewer-entry" ng-repeat="logline in loglines"><span class="log-viewer-server-color" ng-style="{ backgroundColor: logline.color}"></span><span ng-bind-html="logline.HtmlLine"></span></div></div>',
        controller: 'websocketLogViewerController'
    };
})

;