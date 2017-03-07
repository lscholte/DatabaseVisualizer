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
            if (!$cookies.getObject("projects")) {
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
                controller: "addProjectController"
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
            showUnrelated: true,
            databaseConnection: {
                host: null,
                port: null,
                user: null,
                password: null,
                database: null
            }
        };

        $scope.originalProjectName = $scope.project.name;

        $scope.saveProject = function() {

            //If this is not a new project
            if ($scope.originalProjectName != null) {
                projectService.removeProject($scope.originalProjectName);
            }
            //Otherwise we are editing an existing project and changing the name
            projectService.addProject($scope.project);

            //Notify observers that the projects have updated
            $rootScope.$broadcast("projectsUpdated");

        };

        $scope.loadProject = function() {
            var project = projectService.getSelectedProject();
            if (project) {
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
            if (project) {
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

    }).controller("viewProjectController", function($scope, $rootScope, $http, $sce, projectService) {

        var project = projectService.getSelectedProject();

        $scope.status = $sce.trustAsHtml("<h2>(Loading data, please wait...)</h2>");
        $scope.hiddenNodes = [];
        $scope.showNode = function(node) {
            node.visible = true;
            $scope.hiddenNodes.splice($scope.hiddenNodes.indexOf(node), 1);
        };

        var queries = {
            schema: null,
            relations: null
        };

        function finishedQueries() {
            console.log(queries);
            gojs_init(queries.schema, queries.relations);
            $scope.status = '';
            gojs_setNodeData(project.nodes);
        }

        $http({
            method: 'POST',
            url: '/sql/relations',
            data: project.databaseConnection
        }).then(function successCallback(response) {
            queries.relations = response.data;

            // If we are limiting to only related tables, create an array of tables that have relations and get schema
            if (!project.showUnrelated) {
                var tables = {};
                response.data.forEach(function(rel) {
                    tables[rel.from] = null;
                    tables[rel.to] = null;
                });
                getSchema(Object.keys(tables));
            }
            // Otherwise we check if we have already gotten schema and then run the finishedQueries code if we have
            else if (queries.schema !== null) {
                finishedQueries();
            }
        }, function errorCallback(response) {
            $scope.status = $sce.trustAsHtml('<h2 style="color:red">Error loading data! ' + (response.data ? '(' + response.data.message + ')' : '') + '</h2>');
        });

        // Depending on whether or not we want to limit to only related tables, we may need to wait for relations before getting schema.
        function getSchema(limitTables) {
            var data = project.databaseConnection;
            data.limitTables = limitTables;

            $http({
                method: 'POST',
                url: '/sql/schema',
                data: data
            }).then(function successCallback(response) {
                queries.schema = response.data;

                // Check if we have already gotten relations, and if so, run fishedQueries code
                if (queries.relations !== null) {
                    finishedQueries();
                }
            }, function errorCallback(response) {
                $scope.status = $sce.trustAsHtml('<h2 style="color:red">Error loading data! ' + (response.data ? '(' + response.data.message + ')' : '') + '</h2>');
            });
        }
    
        $scope.saveDiagram = function(nodes) {
            project.nodes = nodes;
            projectService.addProject(project);
        };

        // If we aren't limiting our results, then we can go ahead and get schema now
        if (project.showUnrelated)
            getSchema(null);

    }).service("projectService", function($cookies) {

        var selectedProject = null;

        var service = {};

        service.getAllProjects = function() {
            return $cookies.getObject("projects");
        };

        service.doesProjectExist = function(projectName) {
            var allProjects = service.getAllProjects();
            if (allProjects[projectName]) {
                return true;
            }
            return false;
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
            if (allProjects) {
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
            for (item in items) {
                filtered.push(items[item]);
            }
            filtered.sort(function(a, b) {
                if (reverse) {
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
            link: function(scope, element, attrs, controller) {
                var originalProjectName = null;
                if (projectService.getSelectedProject()) {
                    originalProjectName = projectService.getSelectedProject().name;
                }
                element.bind("change", function(e) {
                    var projectName = controller.$modelValue;
                    if (projectService.doesProjectExist(projectName) && originalProjectName !== projectName) {
                        e.target.setCustomValidity("A project with name '" + projectName + "' already exists");
                        return;
                    }
                    e.target.setCustomValidity("");
                });
            }
        };
    });
