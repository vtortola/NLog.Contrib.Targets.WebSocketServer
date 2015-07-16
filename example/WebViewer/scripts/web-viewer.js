angular.module("nglog-websockeet-demo", ['ng-websocket-log-viewer'])

.controller("headerController", function ($scope, $rootScope) {

    $scope.numberOfLines = 50;
    $scope.newSoureColor = '#FFFFFF';
    $scope.newSource = 'ws://127.0.0.1:9001';

    $scope.addSource = function (source, color) {
        $rootScope.$broadcast('websocket-log-viewer-add-source', [source, color]);
    };

    $scope.filter = function (expression) {
        $rootScope.$broadcast('websocket-log-viewer-filter', [expression]);
    };

    $scope.setLineCount = function (count) {
        $rootScope.$broadcast('websocket-log-viewer-line-count', [count]);
    };

    $scope.setLineCount($scope.numberOfLines);   
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