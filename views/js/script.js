//TODO: Consider separating the controllers and services into separate files.
//For now I piled it all into this file because it was easier that way to start
angular.module("test", ["ngCookies", "ngRoute", "ui.bootstrap"])

    .config(function($routeProvider, $locationProvider) {
    
        //TODO:The /home route probably isn't necessary but I think it looks nicer.
        //Also we will probably want a route for the ER diagram page
    
        $routeProvider.when("/home", {
            templateUrl: "views/pages/home.html",
            controller: "homeController"
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
    }
    
}).controller("homeController", function($scope, $cookies, $location, $uibModal, projectService) {
                    
    $scope.projects = projectService.getAllProjects();
    
    $scope.$on("projectsUpdated", function() {
        $scope.projects = projectService.getAllProjects();
    })
    
    $scope.gotoAddProjectPage = function(project) {
        projectService.selectProject(project);
        $location.path("/addProject");
    };
    
    $scope.openProjectDetails = function(projectName) {
        projectService.selectProject(projectName);
        var modalInstance = $uibModal.open({
            templateUrl: "views/pages/addProject.html",
            controller: "addProjectController"
        });
    };
    
    $scope.openDeleteProjectModal = function(projectName) {
        projectService.selectProject(projectName);
        var modalInstance = $uibModal.open({
            templateUrl: "views/pages/deleteProject.html",
            controller: "deleteProjectController"
        });
    };


}).controller("addProjectController", function($scope, $rootScope, $cookies, $location, $uibModalInstance, projectService) {
    
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
    
    $scope.projectNameExists = function() {
        return $scope.project.name in projectService.getAllProjects();
    }
    
    $scope.saveProject = function() {

        //TODO: I think the logic here is probably more complicated than it needs
        //to be, so see if there is a way to simplify it a bit
        
        //If a project with the chosen name already exists
        if($scope.projectNameExists()) {
            //If this is a new project or the name of an existing project is being changed
            if($scope.originalProjectName == null || 
               $scope.project.name !== $scope.originalProjectName) {
                alert("Project " + $scope.project.name + " already exists");
                return;
            }
            //otherwise we are editing the existing project but not changing name
            projectService.addProject($scope.project);
        }
        //Otherwise no existing project has the chosen name
        else {
            //If this is not a new project
            if($scope.originalProjectName != null) {
                projectService.removeProject($scope.originalProjectName);
            }
            //Otherwise we are editing an existing project and changing the name
            projectService.addProject($scope.project);
        }
        
        //Notify observers that the projects have updated
        $rootScope.$broadcast("projectsUpdated");

    };
        
    $scope.loadProject = function() {
        var project = projectService.getSelectedProject();
        if(project) {
            $scope.originalProjectName = project.name;
            $scope.project = project;
        }
    }
    
    $scope.gotoHomePage = function() {
        $location.path("/home");
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
    }
    
    $scope.closeDeleteProjectModal = function() {
        $uibModalInstance.close("cancel");   
    };
    
}).service("projectService", function($cookies) {
    
    var selectedProject = null;
    
    var service = {};
    
    service.getAllProjects = function() {
        return $cookies.getObject("projects");
    };
    
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
});