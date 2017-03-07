angular.module("test").controller("viewProjectController", function($scope, $rootScope, $http, $sce, projectService) {
    
    var project = projectService.getSelectedProject();

    $scope.status = $sce.trustAsHtml("<h2>(Loading data, please wait...)</h2>");
    $scope.hiddenNodes = [];
    
    var myDiagram;

    function gojs_init(schema, relations) {
        var $ = go.GraphObject.make; // for conciseness in defining templates

        myDiagram =
            $(go.Diagram, "myDiagramDiv", // must name or refer to the DIV HTML element
                {
                    initialContentAlignment: go.Spot.Center,
                    allowDelete: false,
                    allowCopy: false,
                    "undoManager.isEnabled": true
                });

        // Define brushes for nodes (in object for easy mapping from sql json data)
        var brushes = {
            PrimaryForeign: $(go.Brush, "Linear", {
                0.15: "rgb(254, 221, 50)",
                0.85: "rgb(67, 101, 56)"
            }),
            Primary: $(go.Brush, "Linear", {
                0: "rgb(254, 221, 50)",
                1: "rgb(254, 182, 50)"
            }),
            Foreign: $(go.Brush, "Linear", {
                0: "rgb(158, 209, 159)",
                1: "rgb(67, 101, 56)"
            }),
            None: $(go.Brush, "Linear", {
                0: "rgb(150, 150, 250)",
                0.5: "rgb(86, 86, 186)",
                1: "rgb(86, 86, 186)"
            })
        };

        // Define brushes for other objects
        var lightgrad = $(go.Brush, "Linear", {
            1: "#E6E6FA",
            0: "#FFFAF0"
        });

        // the template for each attribute in a node's array of item data
        var itemTempl =
            $(go.Panel, "Horizontal",
                $(go.Shape, {
                        desiredSize: new go.Size(10, 10)
                    },
                    new go.Binding("figure", "figure"),
                    new go.Binding("fill", "color")),
                $(go.TextBlock, {
                        stroke: "#333333",
                        font: "bold 14px sans-serif"
                    },
                    new go.Binding("text", "name"))
            );

        // define the Node template, representing an entity
        myDiagram.nodeTemplate =
            $(go.Node, "Auto", // the whole node panel
                {
                    selectionAdorned: true,
                    layoutConditions: go.Part.LayoutStandard & ~go.Part.LayoutNodeSized,
                    fromSpot: go.Spot.AllSides,
                    toSpot: go.Spot.AllSides,
                    isShadowed: true,
                    shadowColor: "#C5C1AA"
                },
                new go.Binding("location", "location").makeTwoWay(),
                // define the node's outer shape, which will surround the Table
                $(go.Shape, "Rectangle", {
                    fill: lightgrad,
                    stroke: "#756875",
                    strokeWidth: 3
                }),
                $(go.Panel, "Table", {
                        margin: 8,
                        stretch: go.GraphObject.Fill
                    },
                    $(go.RowColumnDefinition, {
                        row: 0,
                        sizing: go.RowColumnDefinition.None
                    }),

                    // the table header
                    $(go.TextBlock,
                        {
                            row: 0,
                            alignment: go.Spot.Center,
                            margin: new go.Margin(17, 14, 0, 2), // leave room for Button
                            font: "bold 16px sans-serif"
                        },
                        new go.Binding("text", "key")
                    ),

                    $("Button",
                        {
                            alignment: go.Spot.TopRight,
                            margin: new go.Margin(0, 20, 0, 30),
                            height: 12,
                            click: hideNode
                        },
                        $(go.TextBlock, "×",
                            {
                                alignment: go.Spot.Center,
                                margin: new go.Margin(-2, 0, 0, 1),
                                font: "bold 12px sans-serif"
                            }
                        )
                    ),

                    // the collapse/expand button
                    $("PanelExpanderButton", "LIST", // the name of the element whose visibility this button toggles
                        {
                            row: 0,
                            alignment: go.Spot.TopRight
                        }
                    ),

                    // the list of Panels, each showing an attribute
                    $(go.Panel, "Vertical", {
                            name: "LIST",
                            row: 1,
                            padding: 3,
                            alignment: go.Spot.TopLeft,
                            defaultAlignment: go.Spot.Left,
                            stretch: go.GraphObject.Horizontal,
                            itemTemplate: itemTempl
                        },
                        new go.Binding("itemArray", "items"))
                ) // end Table Panel
            ); // end Node

        // define the Link template, representing a relationship
        myDiagram.linkTemplate =
            $(go.Link, // the whole link panel
                {
                    selectionAdorned: true,
                    layerName: "Foreground",
                    reshapable: true,
                    routing: go.Link.AvoidsNodes,
                    corner: 5,
                    curve: go.Link.JumpOver
                },
                $(go.Shape, // the link shape
                    {
                        stroke: "#303B45",
                        strokeWidth: 2.5
                    }),
                $(go.TextBlock, // the "from" label
                    {
                        textAlign: "center",
                        font: "bold 14px sans-serif",
                        stroke: "#1967B3",
                        segmentIndex: 0,
                        segmentOffset: new go.Point(NaN, NaN),
                        segmentOrientation: go.Link.OrientUpright
                    },
                    new go.Binding("text", "text")),
                $(go.TextBlock, // the "to" label
                    {
                        textAlign: "center",
                        font: "bold 14px sans-serif",
                        stroke: "#1967B3",
                        segmentIndex: -1,
                        segmentOffset: new go.Point(NaN, NaN),
                        segmentOrientation: go.Link.OrientUpright
                    },
                    new go.Binding("text", "toText"))
            );

        // create the model for the E-R diagram


        schema.forEach(function(e) {
            e.items.forEach(function(i) {
                i.color = brushes[i.color];
            })
        });

        myDiagram.model = new go.GraphLinksModel(schema, relations);
        

        //When diagram is updated, we want node data to be stored in persistent storage
        myDiagram.addModelChangedListener(function(event) {
            if (event.isTransactionFinished) {
                var nodeDataToSave = {};
                var dataArray = myDiagram.model.nodeDataArray;
                for (data in dataArray) {
                    var nodeData = dataArray[data];
                    var node = myDiagram.findNodeForData(nodeData);

                    nodeDataToSave[nodeData.key] = {
                        location: {
                            x: node.location.x,
                            y: node.location.y
                        },
                        visible: node.visible,
                        itemsVisible: node.findObject("LIST").visible
                    };
                    
                }
                
                saveDiagram(nodeDataToSave);
            }
        });

    }

    $scope.FDLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.ForceDirectedLayout; 
        }
    };

    $scope.GLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.GridLayout;
        }
    };

    $scope.CLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.CircularLayout;
        }
    };

    $scope.LDLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.LayeredDigraphLayout;
        }
    };

    $scope.TLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.TreeLayout;
        }
    }

    $scope.PrintImage = function() {
        if (myDiagram) {
            var img = myDiagram.makeImage({
                scale: 1,
                maxSize: new go.Size(Infinity, Infinity)
            });
            window.open(img.getAttribute("src"), 'Entity relationship diagram');
        }
    };
    
    $scope.showNode = function(node) {
        node.visible = true;
        $scope.hiddenNodes.splice($scope.hiddenNodes.indexOf(node), 1);
    };
    
    function hideNode(e, obj) {
        var node = obj.part;

        $scope.$apply(function(){
            $scope.hiddenNodes.push(node);
        });

        node.visible = false;
    }

    var queries = {
        schema: null,
        relations: null
    };

    function finishedQueries() {
        console.log(queries);
        gojs_init(queries.schema, queries.relations);
        $scope.status = '';
        loadDiagram();
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

    function saveDiagram(nodes) {
        project.nodes = nodes;
        projectService.addProject(project);
    };
    
    
    //Reads the persisted node data and updates the diagram
    function loadDiagram() {
        if (!myDiagram) {
            return;
        }
        nodes = project.nodes;
        for (nodeKey in nodes) {
            var nodeData = myDiagram.model.findNodeDataForKey(nodeKey);
            if (!nodeData) {
                continue;
            }
            var node = myDiagram.findNodeForData(nodeData);
            if (nodes[nodeKey].location != null) {
                node.location.x = nodes[nodeKey].location.x;
                node.location.y = nodes[nodeKey].location.y;
            }

            if (nodes[nodeKey].visible != null) {
                node.visible = nodes[nodeKey].visible;
                if (!node.visible) {
                    $scope.hiddenNodes.push(node);   
                }
            }
            
            if (nodes[nodeKey].itemsVisible != null) {
                node.findObject("LIST").visible = nodes[nodeKey].itemsVisible;
            }
        }
    }

    // If we aren't limiting our results, then we can go ahead and get schema now
    if (project.showUnrelated) {
        getSchema(null);
    }

});

