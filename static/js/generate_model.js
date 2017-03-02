var myDiagram;

function gojs_init(schema, relations) {
    var $ = go.GraphObject.make; // for conciseness in defining templates

    myDiagram =
        $(go.Diagram, "myDiagramDiv", // must name or refer to the DIV HTML element
            {
                initialContentAlignment: go.Spot.Center,
                allowDelete: false,
                allowCopy: false,
                layout: $(go.ForceDirectedLayout),
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
}

function hideNode(e, obj) {
    var node = obj.part;

    // Get our angular scope and add the node to the hidden nodes list
    var scope = angular.element($(".view-proj")).scope();
    scope.$apply(function(){
        scope.hiddenNodes.push(node);
    });

    node.visible = false;
}

function FDLayout() {
    if (myDiagram)
        myDiagram.layout = new go.ForceDirectedLayout;
}

function GLayout() {
    if (myDiagram)
        myDiagram.layout = new go.GridLayout;
}

function CLayout() {
    if (myDiagram)
        myDiagram.layout = new go.CircularLayout;
}

function LDLayout() {
    if (myDiagram)
        myDiagram.layout = new go.LayeredDigraphLayout;
}

function TLayout() {
    if (myDiagram)
        myDiagram.layout = new go.TreeLayout;
}

function PrintImage() {
    if (myDiagram)
    {
        var img = myDiagram.makeImage({
            scale: 1,
            maxSize: new go.Size(Infinity, Infinity)
        });
        window.open(img.getAttribute("src"), 'Entity relationship diagram');
    }
}
