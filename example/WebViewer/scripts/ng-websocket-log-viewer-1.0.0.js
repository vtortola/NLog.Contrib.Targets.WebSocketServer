angular.module("ng-websocket-log-viewer", [])

.controller('websocketLogViewerController', function ($scope) {

    $scope.loglines = [];
    var servers = [];
    var maxLines = 50;

    $scope.$on('websocket-log-viewer-add-source', function (event, args) {

        var color = args[1];
        var ws = new WebSocket("ws://127.0.0.1:9001");
        ws.onmessage = function (msg) {

            var entry = JSON.parse(msg.data);
            entry.color = color;
            $scope.loglines.push(entry);

            $scope.loglines.sort(logsorter);
            while ($scope.loglines.length > maxLines)
                $scope.loglines.shift()

            $scope.$apply();
            window.scrollTo(0, document.body.scrollHeight);
        }
        servers.push(ws);

        ws.onopen = function () {
            if ($scope.filterExpression) {
                sendFilter(ws, $scope.filterExpression);
            }
        }
    });

    $scope.$on('websocket-log-viewer-filter', function (event, args) {
        servers.forEach(function (server) {
            sendFilter(server, args[0]);
        });
    });
    
    $scope.$on('websocket-log-viewer-line-count', function (event, args) {
        maxLines = Number(args[0]);
    });

    var sendFilter = function (server, expression) {
        server.send(JSON.stringify({
            command: "filter",
            filter: expression
        }));
    }

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