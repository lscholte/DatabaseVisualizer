angular.module("test").controller("viewProjectController", function($scope, $rootScope, $http, $sce, $route, projectService) {

    // Make diagram fill screen with no scroll
    var $diagramDiv = $('.diagramDiv');
    var resizeHandler = function() {
        var y = $diagramDiv.offset().top - $diagramDiv.scrollTop();
        var maxY = window.innerHeight - 15;
        $diagramDiv.height(maxY - y);
    };
    resizeHandler(); // Do it once on load

    $(window).on('resize', resizeHandler); // And then again whenever window size changes

    $scope.project = projectService.getSelectedProject();
    var project = $scope.project; //For convenience

    $scope.status = $sce.trustAsHtml("<h2>(Loading data, please wait...)</h2>");

    var myDiagram;

    function gojs_init(schema, relations) {
        $scope.hiddenNodes = [];

        var $ = go.GraphObject.make; // for conciseness in defining templates

        if (myDiagram) {
            myDiagram.div = null;
        }

        myDiagram = $(go.Diagram, "myDiagramDiv", // must name or refer to the DIV HTML element
            {
                initialContentAlignment: go.Spot.Center,
                allowDelete: false,
                allowCopy: false,
                "undoManager.isEnabled": true
            }
        );

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
            JPA: $(go.Brush, "Linear", {
                0: "rgb(255, 162, 0)",
                1: "rgb(123, 78, 0)"
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

        // define the group template
        myDiagram.groupTemplate =
            $(go.Group, "Auto",
                {
                    isSubGraphExpanded: false
                },
                new go.Binding("name", "key"),

                $(go.Shape, "RoundedRectangle",  // surrounds everything
                    { parameter1: 10 },
                    new go.Binding("fill", "isRelation", function(val) {return val ? "LightSteelBlue" : "lightgray"})
                ),
                $(go.Panel, "Vertical",  // position header above the subgraph
                    $(go.Panel, "Horizontal",
                        { height: 25 },
                        $("SubGraphExpanderButton",
                            {
                                margin: new go.Margin(0, 0, 0, 30),
                            }
                        ),
                        $(go.TextBlock,
                            {
                                font: "Bold 12pt Sans-Serif",
                                margin: new go.Margin(0, 10, 0, 15),
                                editable: true,
                                isMultiline: false,
                            },
                            new go.Binding("text", "title").makeTwoWay()
                        ),
                        // the collapse/expand button
                        $("PanelExpanderButton", "TABLE_LIST",
                            {
                                margin: new go.Margin(0, 5, 0, 0),
                            },
                            new go.Binding("visible", "isSubGraphExpanded", function (val) { return !val; }).ofObject()
                        ),
                        $("Button",
                            {
                                margin: new go.Margin(0, 15, 0, 0),
                                height: 13,
                                click: hideNode,
                                "ButtonBorder.fill": "transparent",
                                "ButtonBorder.stroke": "transparent",
                            },
                            $(go.Shape, "ThinX", {width: 8, height: 8, margin: 0})
                        )
                    ),


                    $(go.Placeholder, { padding: 5 }),
                    $(go.Panel, "Vertical", {
                            name: "TABLE_LIST",
                            padding: 3,
                            alignment: go.Spot.TopLeft,
                            defaultAlignment: go.Spot.Left,
                            stretch: go.GraphObject.Horizontal,
                            itemTemplate: itemTempl,
                        },
                        new go.Binding("visible", "isSubGraphExpanded", function (val) { return !val; }).ofObject(),
                        new go.Binding("itemArray", "items")
                    )
                ),
                {
                    contextMenu:
                        $(
                            go.Adornment, "Vertical",
                            $(
                                "ContextMenuButton",
                                $(go.TextBlock, "Force Directed Layout"),
                                { click: groupFDLayout }
                            ),
                            $(
                                "ContextMenuButton",
                                $(go.TextBlock, "Grid Layout"),
                                { click: groupGLayout }
                            ),
                            $(
                                "ContextMenuButton",
                                $(go.TextBlock, "Tree Layout"),
                                { click: groupTLayout }
                            ),
                            $(
                                "ContextMenuButton",
                                $(go.TextBlock, "Layered Diagraph Layout"),
                                { click: groupLDLayout }
                            ),
                            $(
                                "ContextMenuButton",
                                $(go.TextBlock, "Circular Layout"),
                                { click: groupCLayout }
                            )
                    )
                }
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
                            height: 13,
                            click: hideNode,
                            padding: 0,
                            "ButtonBorder.fill": "transparent",
                            "ButtonBorder.stroke": "transparent",
                        },
                        $(go.Shape, "ThinX", {width: 8, height: 8, margin: 0})
                    ),

                    // the collapse/expand button
                    $("PanelExpanderButton", "ATTRIBUTE_LIST", // the name of the element whose visibility this button toggles
                        {
                            row: 0,
                            alignment: go.Spot.TopRight,
                            margin: new go.Margin(0, 20, 0, 30),
                        }
                    ),

                    // the list of Panels, each showing an attribute
                    $(go.Panel, "Vertical", {
                            name: "ATTRIBUTE_LIST",
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
                        strokeWidth: 2.5
                    },
                    new go.Binding("stroke", "color")),
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

        // Set up the colors for the node items
        schema.forEach(function(e) {
            if (e.items !== undefined) {
                e.items.forEach(function(i) {
                    i.color = brushes[i.color];
                });
            }
        });

        // And for the relations if they don't already have a color
        relations.forEach(function (e) {
           if (!("color" in e)) {
               e.color = "#303B45";
           }
        });

        myDiagram.model = new go.GraphLinksModel(schema, relations);

        //When diagram is updated, we want node data to be stored in persistent storage.
        //First remove the listener in case it already exists
        myDiagram.removeModelChangedListener(modelChangedListener);
        myDiagram.addModelChangedListener(modelChangedListener);

    }

    function modelChangedListener(event) {
            if (event.isTransactionFinished) {

                var nodeDataToSave = {};
                var dataArray = myDiagram.model.nodeDataArray;

                if (project.abstractSchema) {
                    var innerNodeData = {};
                    for (var data in dataArray) {

                        var nodeData = dataArray[data];
                        //If this is a node inside an abstract entity
                        if (nodeData.group) {
                            if (!innerNodeData[nodeData.group]) {
                                innerNodeData[nodeData.group] = {};
                            }
                            storeLowLevelNode(innerNodeData[nodeData.group], nodeData.key);
                        }
                        else {
                            storeHighLevelNode(nodeDataToSave, nodeData.key);
                        }
                    }

                    //For each abstract entity, store its inner node data
                    for (var group in innerNodeData) {
                        nodeDataToSave[group].innerNodeData = innerNodeData[group];
                    }

                }
                else {
                    for (var data in dataArray) {
                        storeLowLevelNode(nodeDataToSave, dataArray[data].key);
                    }
                }

                saveDiagram(nodeDataToSave, project.abstractSchema);

            }
        }

    function storeHighLevelNode(stoedNodes, nodeKey) {
        var nodeData = myDiagram.model.findNodeDataForKey(nodeKey);
        var node = myDiagram.findNodeForData(nodeData);
        var tableList = node.findObject("TABLE_LIST");

        stoedNodes[nodeData.key] = {
            abstractName: nodeData.title,
            location: {
                x: node.location.x,
                y: node.location.y
            },
            isExpanded: node.isSubGraphExpanded,
            tableListVisible: !tableList ? null : tableList.visible,
            entityVisibility: node.visible,
            innerNodeData: {}
        };
    }

    function storeLowLevelNode(storedNodes, nodeKey) {
        var nodeData = myDiagram.model.findNodeDataForKey(nodeKey);
        var node = myDiagram.findNodeForData(nodeData);
        var list = node.findObject("ATTRIBUTE_LIST");

        storedNodes[nodeData.key] = {
            location: {
                x: node.location.x,
                y: node.location.y
            },
            entityVisibility: node.visible,
            attributeVisibility: !list ? null : list.visible
        };
    }

    $scope.toggleSettings = function() {
        $('.settings').slideToggle(function () {
            resizeHandler();
        });
    };

    //The layouts work for both when in relationships and without relationships
    $scope.FDLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.ForceDirectedLayout();
        }
    };

    $scope.GLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.GridLayout();
        }
    };

    $scope.CLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.CircularLayout();
        }
    };

    $scope.LDLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.LayeredDigraphLayout();
        }
    };

    $scope.TLayout = function() {
        if (myDiagram) {
            myDiagram.layout = new go.TreeLayout();
        }
    };

    function groupFDLayout(e, obj) {
        var group = myDiagram.findNodeForData(obj.part.data);
        group.layout = new go.ForceDirectedLayout();
        group.invalidateLayout();
    }

    function groupGLayout(e, obj) {
        var group = myDiagram.findNodeForData(obj.part.data);
        group.layout = new go.GridLayout();
        group.invalidateLayout();
    }

    function groupCLayout(e, obj) {
        var group = myDiagram.findNodeForData(obj.part.data);
        group.layout = new go.CircularLayout();
        group.invalidateLayout();
    }

    function groupLDLayout(e, obj) {
        var group = myDiagram.findNodeForData(obj.part.data);
        group.layout = new go.LayeredDigraphLayout();
        group.invalidateLayout();
    }

    function groupTLayout(e, obj) {
        var group = myDiagram.findNodeForData(obj.part.data);
        group.layout = new go.TreeLayout();
        group.invalidateLayout();
    }

    $scope.setAllAttributeVisibilty = function(visible) {
        if (myDiagram) {
            //var dataArray = myDiagram.model.nodeDataArray;
            myDiagram.model.startTransaction("Set Attribute Visibility");
            myDiagram.nodes.each(function(node) {
                // Nodes
                var list = node.findObject("ATTRIBUTE_LIST");
                if (list)
                    list.visible = visible;

                // Groups (don't apply to expanded groups, which should always have attributes hidden)
                list = node.findObject("TABLE_LIST");
                if (list && !node.isSubGraphExpanded)
                    list.visible = visible;
            });
            myDiagram.model.commitTransaction("Set Attribute Visibility");
        }
    };

    $scope.setAbstractView = function (useAbstract) {
        if (useAbstract !== project.abstractSchema) {
            project.abstractSchema = useAbstract;
            projectService.addProject(project);
            getSchemaAndRelations();
        }
    };

    $scope.setForeignKeyCandidateVisibility = function (visible) {
        if (visible !== project.showForeignKeyCandidates) {
            project.showForeignKeyCandidates = visible;
            projectService.addProject(project);
            getSchemaAndRelations();
        }
    };

    $scope.PrintImage = function() {
        if (myDiagram) {
            var img = myDiagram.makeImage({
                scale: 1,
                maxSize: new go.Size(Infinity, Infinity)
            });
            window.open(img.getAttribute("src"), "Entity relationship diagram");
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
        if (project.abstractSchema) {
            // The schema element will actually have schema and relations. We want to merge the relations into ours
            queries.relations = queries.schema.relations.concat(queries.relations);
            queries.schema = queries.schema.schema;
        }

        if (project.jpaRelations && project.showForeignKeyCandidates) {
            // Merge our JPA relations in
            var jpaRelations = JSON.parse(project.jpaRelations);
            jpaRelations.forEach(function (relation) {
                // First we will color the item in the entity specially
                var fromEntity = queries.schema.find(function(entity) {
                    return entity.key === relation.from;
                });

                if (fromEntity) {
                    // Make sure we can find both sides of this relation
                    var toEntity = queries.schema.find(function(entity) {
                        return entity.key === relation.to;
                    });

                    if (toEntity) {
                        var fromColumn = fromEntity.items.find(function (column) {
                            return column.name === relation.fkColumn;
                        });

                        if (fromColumn) {
                            fromColumn.figure = "Decision";
                            fromColumn.color = "JPA";
                        }

                        // Next we will add the relations, overwriting any current ones
                        queries.relations = queries.relations.filter(function (rel) {
                            return rel.from !== relation.from || rel.to !== relation.to;
                        });

                        // Add a special color to JPA relations
                        relation.color = "#C54D00";
                        queries.relations.push(relation);
                    }
                }
            });
        }

        if (project.abstractSchema) {
            // We and also remove relations between separate abstract entities (they crowd things and cause really buggy
            // gojs behaviour)
            queries.relations = queries.relations.filter(function(relation) {
                var fromEntity = queries.schema.find(function(entity) {
                    return entity.key === relation.from;
                });

                // Skip group relations
                if (fromEntity.isGroup)
                    return true;

                var toEntity = queries.schema.find(function(entity) {
                    return entity.key === relation.to;
                });

                return fromEntity.group === toEntity.group;
            });
        }

        console.log(queries);
        gojs_init(queries.schema, queries.relations);
        $scope.status = '';
        loadDiagram();
    }

    function getSchemaAndRelations() {
        queries.relations = queries.schema = null;
        $http({
            method: "POST",
            url: "/sql/relations",
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
            $scope.status = $sce.trustAsHtml("<h2 style='color:red'>Error loading data! " + (response.data ? "(" + response.data.message + ")" : "") + "</h2>");
        });

        // If we aren't limiting our results, then we can go ahead and get schema now
        if (project.showUnrelated) {
            getSchema(null);
        }
    }

    // Depending on whether or not we want to limit to only related tables, we may need to wait for relations before getting schema.
    function getSchema(limitTables) {
        var data = project.databaseConnection;
        data.limitTables = limitTables;

        $http({
            method: "POST",
            url: "/sql/" + (project.abstractSchema ? "abstract-schema" : "schema"),
            data: data
        }).then(function successCallback(response) {
            queries.schema = response.data;

            // Check if we have already gotten relations, and if so, run fishedQueries code
            if (queries.relations !== null) {
                finishedQueries();
            }
        }, function errorCallback(response) {
            $scope.status = $sce.trustAsHtml("<h2 style='color:red'>Error loading data! " + (response.data ? "(" + response.data.message + ")" : "") + "</h2>");
        });
    }

    function saveDiagram(nodes, isAbstractDiagram) {
        if (isAbstractDiagram) {
            project.highLevelNodes = nodes;
        }
        else {
            project.lowLevelNodes = nodes;
        }

        projectService.addProject(project);
    }

    function loadDiagram() {
        project.abstractSchema ?
            loadHighLevelDiagram() :
            loadLowLevelDiagram();
    }

    function loadHighLevelNode(storedNodes, nodeKey) {
            var nodeData = myDiagram.model.findNodeDataForKey(nodeKey);
            if (!nodeData) {
                return;
            }

            var node = myDiagram.findNodeForData(nodeData);

            if (storedNodes[nodeKey].abstractName != null) {
                myDiagram.model.setDataProperty(nodeData, "title", storedNodes[nodeKey].abstractName);
            }

            if (storedNodes[nodeKey].location != null) {
                node.location.x = storedNodes[nodeKey].location.x;
                node.location.y = storedNodes[nodeKey].location.y;
            }

            if (storedNodes[nodeKey].isExpanded != null) {
                node.isSubGraphExpanded = storedNodes[nodeKey].isExpanded;
            }

            var tableList = node.findObject("TABLE_LIST");
            if (tableList && storedNodes[nodeKey].tableListVisible != null) {
                tableList.visible = storedNodes[nodeKey].tableListVisible;
            }

            if (storedNodes[nodeKey].entityVisibility != null) {
                node.visible = storedNodes[nodeKey].entityVisibility;
                if (!node.visible) {
                    $scope.hiddenNodes.push(node);
                }
            }

            var innerNodes = storedNodes[nodeKey].innerNodeData;
            for (var innerNodeKey in innerNodes) {
                loadLowLevelNode(innerNodes, innerNodeKey);
            }
    }

    function loadLowLevelNode(storedNodes, nodeKey) {
        var nodeData = myDiagram.model.findNodeDataForKey(nodeKey);
        if (!nodeData) {
            return;
        }

        var node = myDiagram.findNodeForData(nodeData);

        if (storedNodes[nodeKey].location != null) {
            node.location.x = storedNodes[nodeKey].location.x;
            node.location.y = storedNodes[nodeKey].location.y;
        }

        if (storedNodes[nodeKey].entityVisibility != null) {
            node.visible = storedNodes[nodeKey].entityVisibility;
            if (!node.visible) {
                $scope.hiddenNodes.push(node);
            }
        }

        var list = node.findObject("ATTRIBUTE_LIST");
        if (list && storedNodes[nodeKey].attributeVisibility != null) {
            list.visible = storedNodes[nodeKey].attributeVisibility;
        }
    }

    //Reads the persisted node data and updates the diagram
    function loadLowLevelDiagram() {
        if (!myDiagram) {
            return;
        }

        var nodes = project.lowLevelNodes;
        for (var nodeKey in nodes) {
            loadLowLevelNode(nodes, nodeKey);
        }
    }

    function loadHighLevelDiagram() {
        if (!myDiagram) {
            return;
        }

        var nodes = project.highLevelNodes;
        for (var nodeKey in nodes) {
            loadHighLevelNode(nodes, nodeKey);
        }
    }

    getSchemaAndRelations();

});

