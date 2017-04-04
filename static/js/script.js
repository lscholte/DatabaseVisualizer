angular.module("test", ["ngRoute", "ui.bootstrap", "ngFileUpload"])

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

    }).controller("indexController", function($scope, $window) {

        $scope.initCookies = function() {
            if (!$window.localStorage["projects"]) {
                $scope.clearCookies();
            }
        };

        $scope.clearCookies = function() {
            $window.localStorage["projects"] = JSON.stringify({});
        };

    }).controller("homeController", function($scope, $window, $uibModal, $location, projectService) {

        $scope.projects = projectService.getAllProjects();

        $scope.$on("projectsUpdated", function() {
            $scope.projects = projectService.getAllProjects();
        });

        $scope.openProjectDetails = function(projectName) {
            projectService.selectProject(projectName);
            var modalInstance = $uibModal.open({
                templateUrl: "pages/addProject.html",
                controller: "addProjectController",
                backdrop: 'static',
                keyboard  : false
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

    }).controller("addProjectController", function($scope, $http, Upload, $rootScope, $window, $uibModalInstance, projectService) {

        $scope.project = {
            name: null,
            showUnrelated: true,
            abstractSchema: true,
            showForeignKeyCandidates: true,
            databaseConnection: {
                host: null,
                port: null,
                user: null,
                password: null,
                database: null
            },
            jpaRelations: null,
            sourceFiles: []
        };

        $scope.ready = true;

        $scope.originalProjectName = $scope.project.name;

        $scope.saveProject = function() {

            $("#save_btn").prop("disabled", true);
            $("#cancel_btn").prop("disabled", true);

            //If this is not a new project
            if ($scope.originalProjectName !== null) {
                projectService.removeProject($scope.originalProjectName);
            }
            //Otherwise we are editing an existing project and changing the name
            projectService.addProject($scope.project);

            //Notify observers that the projects have updated
            $rootScope.$broadcast("projectsUpdated");

            if($scope.project.sourceFiles.length > 0 && $scope.project.sourceFiles[0].name) {
                $scope.ready = false;

                Upload.upload({
                    url: "/upload-file",
                    data: {file: $scope.project.sourceFiles}
                }).then(function (resp) {
                    $scope.ready = true;
                    $scope.closeProjectDetails();
                    $("#save_btn").prop("disabled", false);
                    $("#cancel_btn").prop("disabled", false);
                    if(resp.data.trim().startsWith("error")) {
                        alert("Failed to parse the Java code, please ensure you selected the base directory of your java sources.\n\nFor a maven project, this would be something like PROJECT_DIR/src/main/java");
                    }
                    else {
                        $scope.project.jpaRelations = resp.data;
                        projectService.addProject($scope.project);
                        $rootScope.$broadcast("projectsUpdated");
                    }
                }, function (resp) {
                }, function (evt) {
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                    $scope.progress = "Progress: " + progressPercentage + "%";
                    if(progressPercentage >= 100) {
                        $scope.progress = "Parsing Java";
                    }
                });
            }


        };

        $scope.loadProject = function() {
            var project = projectService.getSelectedProject();
            if (project) {
                $scope.originalProjectName = project.name;
                $scope.project = project;
            }
        };

        $scope.closeProjectDetails = function() {
            if($scope.ready) {
                $uibModalInstance.close("cancel");
            }
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

    }).service("projectService", function($window) {

        var selectedProject = null;

        var service = {};

        service.getAllProjects = function() {
            return JSON.parse($window.localStorage["projects"]);
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
            $window.localStorage["projects"] = JSON.stringify(allProjects);
        };

        service.removeProject = function(projectName) {
            var allProjects = service.getAllProjects();
            delete allProjects[projectName];
            $window.localStorage["projects"] = JSON.stringify(allProjects);
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
    }).directive("javaFiles", function() {
        return {
            restrict: "A",
            require: "ngModel",
            priority: 1,
            link: function(scope, element, attrs, controller) {
                element.bind("change", function(e) {
                    var files = controller.$modelValue;
                    if(files.length === 0) {
                        e.target.setCustomValidity("The uploaded source code must contain at least 1 Java file");
                        return;
                    }
                    e.target.setCustomValidity("");

                });
            }
        };
    }).directive("jsonRelations", function() {
        return {
            restrict: "A",
            require: "ngModel",
            priority: 1,
            link: function(scope, element, attrs, controller) {
                element.bind("change", function(e) {
                    var jsonText = controller.$modelValue;
                    var relations = JSON.parse(jsonText);
                    if (Array.isArray(relations)) {
                        for (var i = 0; i < relations.length; i++) {
                            var relation = relations[i];
                            if (!('from' in relation) || !('to' in relation) || !('text' in relation) || !('toText' in relation) || !('fkColumn' in relation)) {
                                e.target.setCustomValidity("JSON Relations are invalid");
                                return;
                            }
                        }
                    }

                    e.target.setCustomValidity("");
                });
            }
        };
    }).directive("fileInput", function(Upload) {
        return {
            restrict: "A",
            require: "ngModel",
            priority: 0,
            link: function (scope, element ,attrs, controller) {
                element.on("change", function(e) {
                    var files = Array.prototype.filter.call(element[0].files, function(file) {
                        return file.name.endsWith(".java");
                    });

                    for(var i in files) {
                        files[i] = Upload.rename(files[i], files[i].webkitRelativePath);
                    }

                    controller.$setViewValue(files);
                })
            }
        }
    });
