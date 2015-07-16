angular.module("ng-websocket-log-viewer", [])

.controller('websocketLogViewerController', function ($scope) {

    $scope.loglines = [];
    var servers = [];
    var maxLines = 50;

    var lastTimespan = 0;

    $scope.$on('websocket-log-viewer-add-source', function (event, args) {
        connect(args[0], args[1], 0);
    });
        
    $scope.$on('websocket-log-viewer-filter', function (event, args) {
        servers.forEach(function (server) {
            sendFilter(server, args[0]);
        });
    });
    
    $scope.$on('websocket-log-viewer-line-count', function (event, args) {
        maxLines = Number(args[0]);
    });

    $scope.$on('websocket-log-viewer-pause', function (event) {
        pause();
    });

    var paused = false;
    var cache = [];
    var pause = function () {
        if (paused) {
            for (var i = 0; i < cache.length; i++) {
                $scope.loglines.push(cache[i]);
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
            $scope.loglines.push(entry);
            updateLogBoard();
        }
    }

    var connect = function (url, color, retry) {
 
        var ws = new WebSocket(url);
        showMessage("Connecting to '" + url + "' ...", color);
        ws.onmessage = function (msg) {

            var entry = JSON.parse(msg.data);
            entry.color = color;
            saveEntry(entry);
            lastTimespan = entry.Timestamp;
        }
        servers.push(ws);

        ws.onopen = function () {
            showMessage("Connected to '" + url + "'.", color);
            if ($scope.filterExpression) {
                sendFilter(ws, $scope.filterExpression);
            }
        };

        ws.onclose = function () {
            connectionRetry(url, color, retry);
        };

        ws.onerror = function () {
            showMessage("Error on '" + url + "' connection.", color);
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
        saveEntry({
            Timestamp: lastTimespan++,
            Line: line,
            color: color
        });
    };

    var connectionRetry = function (url, color, retry) {

        if (retry > 10) {
            showMessage("Retried connection to '" + url + "' 10 times. Giving up.", color);
        } else {
            retry++;
            var seconds = 5 * retry;

            setTimeout(function () {
                connect(url, color, retry);
            }, seconds * 1000);
            showMessage("Disconnected from '" + url + "' " + retry + " times, retrying again in " + seconds + " seconds.", color);
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
        template: '<div class="log-viewer"><div class="log-viewer-entry" ng-repeat="logline in loglines"><span class="log-viewer-server-color" ng-style="{ backgroundColor: logline.color}"></span><span>{{logline.Line}}</span></div></div>',
        controller: 'websocketLogViewerController'
    };
})

;