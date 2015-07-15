angular.module("nglog-websockeet-demo", ['ng-websocket-log-viewer'])

.controller("headerController", function ($scope, $rootScope) {

    $scope.numberOfLines = 50;
    $scope.newSoureColor = '#FFFFFF';

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

    setTimeout(function () {
        $scope.addSource('', '#ffffff');
    }, 500);
    
})

;