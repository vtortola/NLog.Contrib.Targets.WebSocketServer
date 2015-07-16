angular.module("ng-websocket-log-viewer", [])

.controller('websocketLogViewerController', function ($scope) {

    $scope.loglines = [];
    var servers = [];
    var maxLines = 50;

    var lastTimespan = 0;

    $scope.$on('websocket-log-viewer-add-source', function (event, args) {
        connect('ws://127.0.0.1:9001', args[1], 1);
    });
        
    $scope.$on('websocket-log-viewer-filter', function (event, args) {
        servers.forEach(function (server) {
            sendFilter(server, args[0]);
        });
    });
    
    $scope.$on('websocket-log-viewer-line-count', function (event, args) {
        maxLines = Number(args[0]);
    });

    var connect = function (url, color, retry) {
 
        var ws = new WebSocket(url);
        showMessage("Connecting to '" + url + "' ...", color);
        ws.onmessage = function (msg) {

            var entry = JSON.parse(msg.data);
            entry.color = color;
            $scope.loglines.push(entry);
            lastTimespan = entry.Timestamp;

            updateLogBoard();
        }
        servers.push(ws);

        ws.onopen = function () {
            showMessage("Connected to '" + url + "'.", color);
            if ($scope.filterExpression) {
                sendFilter(ws, $scope.filterExpression);
            }
        };

        ws.onclose = function () {
            connectionRetry(url, color, retry++);
        };

        ws.onerror = function () {
            connectionRetry(url, color, retry++);
        };
    };

    var updateLogBoard = function () {
        $scope.loglines.sort(logsorter);
        while ($scope.loglines.length > maxLines)
            $scope.loglines.shift()

        $scope.$apply();
        window.scrollTo(0, document.body.scrollHeight);
    };

    var showMessage = function (line, color) {
        $scope.loglines.push({
            Timestamp: lastTimespan++,
            Line: line,
            color: color
        });
        updateLogBoard();
    };

    var connectionRetry = function (url, color, retry) {

        showMessage("Disconnected from '" + url + "' " + retry + " times.", color);

        if (retry >= 10) {
            return;
        }

        showMessage("Retrying connection to '" + url + "' in 2 seconds.", color);

        setTimeout(function () {
            connect(url, color, retry);
        }, 2000);
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
        template: '<div class="log-viewer"><div class="log-viewer-entry" ng-repeat="logline in loglines" ng-style="{ color: logline.color}">{{logline.Line}}</div></div>',
        controller: 'websocketLogViewerController',
        link: function (scope, elem, attrs) {
            
        }
    };
})

;