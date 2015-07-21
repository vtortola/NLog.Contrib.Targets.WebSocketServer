angular.module("nglog-websockeet-demo", ['ng-websocket-log-viewer'])

.controller("logController", function ($scope, $rootScope, websocketLogConstants) {

    $scope.numberOfLines = 50;
    $scope.newSoureColor = '#FFFFFF';
    $scope.newSource = 'ws://127.0.0.1:9001';
    $scope.paused = false;

    var sourceCount = 1;
    var colors = ['#FFFFFF', '#00FF00', '#FF0000', '#0000FF', '#FFFF00', '#9933FF'];

    $scope.addSource = function (source, color) {
        $scope.$broadcast(websocketLogConstants.commands.connect, { url: source, color: color, id: sourceCount });
        $scope.newSoureColor = colors[sourceCount++ % colors.length];
    };

    $scope.filter = function (expression) {
        $rootScope.$broadcast(websocketLogConstants.commands.filter, { expression: expression });
    };

    $scope.highlight = function (highlightText) {
        $rootScope.$broadcast(websocketLogConstants.commands.highlight, { text: highlightText, id: 1, 'class': 'log-highlight' });
    };

    $scope.setLineCount = function (count) {
        $rootScope.$broadcast(websocketLogConstants.commands.lineCount, { count: count });
    };

    $scope.pause = function () {
        $rootScope.$broadcast(websocketLogConstants.commands.pause);
        $scope.paused = !$scope.paused;
    };

    $scope.$on(websocketLogConstants.events.highlighted, function (event, args) {
        console.log(args);
    });

    setTimeout(function () {
        $scope.setLineCount($scope.numberOfLines);
        $rootScope.$broadcast(websocketLogConstants.commands.highlight, { text: "ERROR", id: 2, 'class': 'log-highlight-error', silent: true });
        $rootScope.$broadcast(websocketLogConstants.commands.highlight, { text: "WARN", id: 3, 'class': 'log-highlight-warn', silent: true });
    }, 500);
})

.directive('expandOnFocus', function () {
    return {
        restrict: 'A',
        link: function (scope, elem, attrs) {
            var expandTo = attrs['expandOnFocus'];
            if (expandTo[expandTo.length] !== 'x')
                expandTo += "px";

            var original = null;
            elem.bind("focus", function () {
                original = elem[0].offsetWidth;
                elem.css("width", expandTo);
            });
            elem.bind("blur", function () {
                if(original)
                    elem.css("width", original+"px");
            });
        }
    };
})

;