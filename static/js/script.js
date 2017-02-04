//TODO: Consider separating the controllers and services into separate files.
//For now I piled it all into this file because it was easier that way to start
angular.module("test", ["ngCookies", "ngRoute", "ui.bootstrap"])

    .config(function($routeProvider, $locationProvider) {

        //TODO:The /home route probably isn't necessary but I think it looks nicer.
        //Also we will probably want a route for the ER diagram page

        $routeProvider.when("/home", {
            templateUrl: "pages/home.html",
            controller: "homeController"
        }).when("/view", {
            templateUrl: "pages/viewProject.html",
            controller: "viewProjectController"
        }).otherwise({
            redirectTo: "/home"
        });

        //Removes # from URLs
        $locationProvider.html5Mode(true);

}).controller("indexController", function($scope, $cookies) {

    $scope.initCookies = function() {
        if(!$cookies.getObject("projects")) {
            $scope.clearCookies();
        }
    };

    $scope.clearCookies = function() {
        $cookies.putObject("projects", {});
    };

}).controller("homeController", function($scope, $cookies, $uibModal, $location, projectService) {

    $scope.projects = projectService.getAllProjects();

    $scope.$on("projectsUpdated", function() {
        $scope.projects = projectService.getAllProjects();
    });

    $scope.openProjectDetails = function(projectName) {
        projectService.selectProject(projectName);
        var modalInstance = $uibModal.open({
            templateUrl: "pages/addProject.html",
            controller: "addProjectController",
            size: "sm"
        });
    };

    $scope.openDeleteProjectModal = function(projectName) {
        projectService.selectProject(projectName);
        var modalInstance = $uibModal.open({
            templateUrl: "pages/deleteProject.html",
            controller: "deleteProjectController"
        });
    };

    $scope.openProjectView = function(projectName) {
        projectService.selectProject(projectName);
        $location.path("/view");
    };

}).controller("addProjectController", function($scope, $rootScope, $cookies, $uibModalInstance, projectService) {

    $scope.project = {
        name: null,
        databaseConnection: {
            host: null,
            port: null,
            username: null,
            password: null
        }
    };

    $scope.originalProjectName = $scope.project.name;

    $scope.saveProject = function() {

        //If this is not a new project
        if($scope.originalProjectName != null) {
            projectService.removeProject($scope.originalProjectName);
        }
        //Otherwise we are editing an existing project and changing the name
        projectService.addProject($scope.project);

        //Notify observers that the projects have updated
        $rootScope.$broadcast("projectsUpdated");

    };

    $scope.loadProject = function() {
        var project = projectService.getSelectedProject();
        if(project) {
            $scope.originalProjectName = project.name;
            $scope.project = project;
        }
    };

    $scope.closeProjectDetails = function() {
        $uibModalInstance.close("cancel");
    };

}).controller("deleteProjectController", function($scope, $rootScope, $uibModalInstance, projectService) {

    $scope.projectName = null;

    $scope.getProjectName = function() {
        var project = projectService.getSelectedProject();
        if(project) {
            $scope.projectName = project.name;
        }
    };

    $scope.deleteProject = function() {
        projectService.removeProject($scope.projectName);
        $rootScope.$broadcast("projectsUpdated");
    };

    $scope.closeDeleteProjectModal = function() {
        $uibModalInstance.close("cancel");
    };

}).controller("viewProjectController", function($scope, $rootScope, projectService) {

    $scope.getProjectInfo = function() {
        var project = projectService.getSelectedProject();
        if(project) {
            $scope.project = project;
        }
    };

}).service("projectService", function($cookies) {

    var selectedProject = null;

    var service = {};

    service.getAllProjects = function() {
        return $cookies.getObject("projects");
    };

    service.doesProjectExist = function(projectName) {
        var allProjects = service.getAllProjects();
        if(allProjects[projectName]) {
            return true;
        }
        return false;
    }

    service.addProject = function(project) {
        var allProjects = service.getAllProjects();
        allProjects[project.name] = project;
        $cookies.putObject("projects", allProjects);
    };

    service.removeProject = function(projectName) {
        var allProjects = service.getAllProjects();
        delete allProjects[projectName];
        $cookies.putObject("projects", allProjects);
    };

    service.selectProject = function(projectName) {
        var allProjects = service.getAllProjects();
        if(allProjects) {
            selectedProject = allProjects[projectName];
        }
    };

    service.getSelectedProject = function() {
        return selectedProject;
    };

    return service;
}).filter("orderObjectsBy", function() {
    return function(items, property, reverse) {
        var filtered = [];
        for(item in items) {
            filtered.push(items[item]);
        }
        filtered.sort(function(a, b) {
            if(reverse) {
                return a[property] > b[property] ? -1 : 1;
            }
            return a[property] > b[property] ? 1 : -1;
        });
        return filtered;
    };
}).directive("uniqueProject", function(projectService) {
    return {
        restrict: "A",
        require: "ngModel",
        link: function (scope, element, attrs, controller) {
            var originalProjectName = projectService.getSelectedProject().name;
            element.bind("change", function(e) {
                var projectName = controller.$modelValue;
                if(projectService.doesProjectExist(projectName) && originalProjectName !== projectName) {
                    e.target.setCustomValidity("A project with name '" + projectName + "' already exists");
                    return;
                }
                e.target.setCustomValidity("");
            });
        }
    };
});
