'use strict'

require.config({
	paths: {
		yfiles: 'javascript/yFiles/lib/umd/yfiles/',
		utils: 'javascript/yFiles/demos/utils/',
		resources: 'javascript/yFiles/demos/resources/'
	}
})

require([

	'yfiles/view-editor',
	'utils/ContextMenu',
	'utils/FileSaveSupport',
	'yfiles/complete',
	//'yfiles/view',
	'./js/ClientSideImageExport.js',
	'./js/ClientSidePdfExport.js',
	'yfiles/view-layout-bridge',
	'resources/license'
	], (/** @type {yfiles_namespace} */ /** typeof yfiles */ yfiles,
			ContextMenu,
			FileSaveSupport,
			PositionHandler,
			ClientSideImageExport,
			ClientSidePdfExport
	) => {


		/* some global variables */
		let graphComponent = new yfiles.view.GraphComponent("#graphComponent");

		let graphMLIOHandler = null;

		let graph = null;

		var standardServer = "http://alice.informatik.uni-tuebingen.de:5555/embeddings"

		let gridInfo = null;
		let grid = null;

		var nodesStableSize = true;
		var allowDoubleEdges = false;

		let myGraph;

		let clientSidePdfExport= null;
		let clientSideImageExport =null;

		var pagesArray = [[],[],[],[]]
		let analyzer = null;

		/* Main Function */

		function run() {
			graphComponent.inputMode = new yfiles.input.GraphEditorInputMode()
			const createEdgeInputMode = graphComponent.inputMode.createEdgeInputMode


			/* zooming only when ctrl is held*/
			graphComponent.mouseWheelBehavior =
				yfiles.view.MouseWheelBehaviors.ZOOM | yfiles.view.MouseWheelBehaviors.SCROLL;

			/* resizing of nodes not allowed by default, changeable by resizableNode checkbox in tools section*/
			graphComponent.inputMode.showHandleItems =
				yfiles.graph.GraphItemTypes.ALL & ~yfiles.graph.GraphItemTypes.NODE;

			/* UNDO REDO ALLOWED */
			graphComponent.graph.undoEngineEnabled = true;

			/* labels can't be selected */
			graphComponent.inputMode.clickableItems = yfiles.graph.GraphItemTypes.NODE | yfiles.graph.GraphItemTypes.EDGE


			graphMLIOHandler = new yfiles.graphml.GraphMLIOHandler();

			const support = new yfiles.graphml.GraphMLSupport({
				graphComponent: graphComponent,
				graphMLIOHandler: graphMLIOHandler
			});






			/*
			 * WHEN A NODE/EDGE IS CREATED LISTENER
			 */

			graphComponent.inputMode.addNodeCreatedListener((sender, args) => {
				let node = args.item;

				// if no label is set, create new label
				if (node.labels.size == 0) {
					let label = getNextLabel("node")
					graphComponent.graph.addLabel(node, label.toString())
				}

				// if no tag is set, set new tag
				if (node.tag == null) {
					node.tag = getNextTag()

				}

			})

			// TODO change tag here DONE

			createEdgeInputMode.addEdgeCreatedListener((sender, args)=> {
				let edge = args.item

				edge.tag = edge.sourceNode.tag + "-(0)-" + edge.targetNode.tag

				if (edge.labels.size == 0) {
					let label = getNextLabel("edge");
					var newLabel = graphComponent.graph.addLabel(edge, label.toString())


					// for each edge assign edge label style (label above edge)

					const edgeSegmentLabelModel = new yfiles.graph.EdgeSegmentLabelModel()
					edgeSegmentLabelModel.offset = 7
					edgeSegmentLabelModel.autoRotation = false;
					graphComponent.graph.setLabelLayoutParameter(
							newLabel,
							edgeSegmentLabelModel.createParameterFromCenter({
								sideOfEdge: "ABOVE_EDGE",
							})
					)

					// forbid double edges
					var edges = graphComponent.graph.edges.toArray();

					// abort when double edges are not allowed
					if (! allowDoubleEdges) {
						edges.forEach(function(e) {
							if (((edge.sourceNode == e.sourceNode && edge.targetNode == e.targetNode) || (edge.sourceNode == e.targetNode && edge.targetNode == e.sourceNode)) && edge != e){
								setTimeout(function() {
									if (graphComponent.graph.contains(edge)) {
										graphComponent.graph.remove(edge);
									}
								},10)
							}
						})
					} else {
						// double Edges are allowed
						// what to do with tags??
					}

				}

			})


			/*
			 * NODE COPY LISTENER
			 */

			graphComponent.clipboard.fromClipboardCopier.addNodeCopiedListener((sender, args) => {
				args.copy.tag = getNextTag()
			})


			/*
			 * EDGE COPY LISTENER
			 * TODO change tag here DONE
			 */

			graphComponent.clipboard.fromClipboardCopier.addEdgeCopiedListener((sender, args) => {
				var edge = args.copy
				var edges = graphComponent.graph.edges.toArray();

				if (! allowDoubleEdges) {
					edges.forEach(function(e) {
						if (((edge.sourceNode == e.sourceNode && edge.targetNode == e.targetNode) || (edge.sourceNode == e.targetNode && edge.targetNode == e.sourceNode)) && edge != e){
							setTimeout(function() {
								if (graphComponent.graph.contains(edge)) {
									graphComponent.graph.remove(edge);
								}
							},10)
						}
					})
				} else {
					var occurrance = 0;
					edges.forEach(function(e) {
						if (edge.sourceNode == e.sourceNode && edge.targetNode == e.targetNode) {
							occurrance = occurrance+1;
						}
					})
					edge.tag = edge.sourceNode + "-(" + occurrance + ")-" + edge.targetNode
				}
			})



			/*
			 *
			 * WHEN A LABEL IS CHANGED THE CONSTRAINT GETS CHANGED TO
			 *
			 */

			graphComponent.inputMode.addLabelTextChangedListener((sender, args) => {

				// iterate over all connected constraints and update these tags
				var constr = findRelatedConstraintsDeluxe(args.item.owner)
				constr.forEach(function(c) {
					var obj = c.getObjects()

					var printable = c.getPrintable()
					c.updatePrintable()

					if (c instanceof Predecessor) {
						$("#constraintTags").tagit("updateTag", printable, c.getPrintable())

					} else if (c instanceof Consecutive) {
                        $("#constraintTags").tagit("updateTag", printable, c.getPrintable())

                    } else if (c instanceof SetAsFirst) {
                        $("#constraintTags").tagit("updateTag", printable, c.getPrintable())

                    } else if (c instanceof SamePage) {
						$("#constraintTags").tagit("updateTag", printable, c.getPrintable())

					} else if (c instanceof DifferentPages) {
                        $("#constraintTags").tagit("updateTag", printable, c.getPrintable())

                    } else if (c instanceof NotAllInSamePage) {
                        $("#constraintTags").tagit("updateTag", printable, c.getPrintable())

                    } else if (c instanceof AssignedTo) {
						$("#constraintTags").tagit("updateTag", printable, c.getPrintable())

					} else {console.log("error")}

				})


			})

			//displaying current server
			var currentServer = window.localStorage.getItem("currentServer")
			if (currentServer == null) {
				currentServer = standardServer
			}
			document.getElementById("displayCurrentServer").innerHTML = currentServer;

			initializeGraphDefaults();
			initializeSnapping();
			initializeGrid();
			configureContextMenu(graphComponent);

			configureDeletion();
			registerCommands();



			// check if there is a hash location, if yes display graph with #id
			if (location.hash != "") {

				var embeddingID = location.hash.slice(3)
				let link;

				// checking if there is a preferred server in the local storage, if not use the standard server
				var currentServer = window.localStorage.getItem("currentServer")
				if (currentServer == null) {
					//document.getElementById("displayCurrentServer").innerHTML = "http://sofa.fsi.uni-tuebingen.de:5555/embeddings/"
					link = standardServer + "/" + embeddingID
				} else {
					//document.getElementById("displayCurrentServer").innerHTML = currentServer
					link = currentServer + "/embeddings/" + embeddingID
				}


				let object;

				// ajax request for this embedding
				$.ajax({
					url: link,
					success:
						function(response) {
						object = response;
					},
					error: function() {
						alert("error")
						//$("#errorDialog").dialog("open")
					},
					complete: function() {
						var graph = object.graph
						graph = atob(graph)


						// read graph
						graphMLIOHandler
						.readFromGraphMLText(graphComponent.graph, graph)
						.then(() => {
							// transform graph according to embedding
							if (location.hash.slice(0,3) == "#ll") {
								// display linear layout
								interpretResultAsLinearLayout(object)
							} else if (location.hash.slice(0,3) == "#or"){
								// display original embedding
								interpretResultAsRegularLayout(object)
							}

						})
					}
				})


			}

		}


		/*
		 * creates new labels for nodes or edges
		 */
		function getNextLabel(item) {
			if (item == "node") {
				var max = -1;
				graphComponent.graph.nodes.forEach(function(n) {
					var x = parseInt(n.toString());
					if (x>max) {
						max = x;
					}
				})

				return max +1;
			} else if (item == "edge") {
				var max =-1;
				graphComponent.graph.edges.forEach(function(e) {
					var x = parseInt(e.toString());
					if (x>max) {
						max = x;
					}
				})

				return max+1;
			}
		}


		/*
		 * creates tags for nodes
		 */
		function getNextTag() {
			var max = -1;
			graphComponent.graph.nodes.forEach(function(n) {
				if (parseInt(n.tag) > max) {
					max = parseInt(n.tag)
				}
			})
			return max+1;
		}



		/*
		 *
		 * this function configures the standard deletion to first check if any constraints are affected and if there are, rechecks if deletion is desired
		 *
		 */
		function configureDeletion() {

			// change command binding of deleting to first showing
			graphComponent.inputMode.keyboardInputMode.addCommandBinding(
					yfiles.input.ICommand.DELETE,
					() => {

						// collect all items that should be deleted, collect all adjacent edges that get deleted too
						const selection = graphComponent.selection
						var adjEdges = [];

						var delNodes = selection.selectedNodes.toArray();
						delNodes.forEach(function(node) {
							var arr = graphComponent.graph.edgesAt(node).toArray();
							arr.forEach(function(edge) {
								adjEdges.push(edge)
							})
						})


						// all items that get deleted
						var selItems = selection.toArray();
						selItems = selItems.concat(adjEdges);


						// search for related constraints
						var relConstraints = []

						selItems.forEach(function(i) {
							relConstraints = relConstraints.concat(findRelatedConstraintsDeluxe(i))
						})

						// if related constraints exist, show dialog
						if (relConstraints.length > 0) {
							$("#deleteDialog").dialog("open");
						} else {
							graphComponent.inputMode.deleteSelection();
						}

					})

		}





		/*
		 *
		 * changes which elements should be selected by marquee selection
		 *
		 */

		function changeSelectionMode(marqueeSelected) {
			if (marqueeSelected == "all") {
				graphComponent.inputMode.marqueeSelectableItems =  yfiles.graph.GraphItemTypes.ALL
			} else if (marqueeSelected == "nodes"){
				graphComponent.inputMode.marqueeSelectableItems =  yfiles.graph.GraphItemTypes.NODE

			} else {
				graphComponent.inputMode.marqueeSelectableItems =  yfiles.graph.GraphItemTypes.EDGE
			}

		}





		/*
		 *
		 *  configuring the context menu
		 *
		 */

		function configureContextMenu(graphComponent) {
			const inputMode = graphComponent.inputMode
			const contextMenu = new ContextMenu(graphComponent)



			contextMenu.addOpeningEventListeners(graphComponent, location => {
				if (inputMode.contextMenuInputMode.shouldOpenMenu(graphComponent.toWorldFromPage(location))) {
					contextMenu.show(location)
				}
			})


			inputMode.addPopulateItemContextMenuListener((sender, args) =>
			populateContextMenu(contextMenu, graphComponent, args)
			)


			inputMode.contextMenuInputMode.addCloseMenuListener(() => {
				$("#pageDialog").empty()
				contextMenu.close()
			})
			contextMenu.onClosedCallback = () => {
				inputMode.contextMenuInputMode.menuClosed()
			}
		}

		/*
		 * adds menu items to the context menu
		 */

		function populateContextMenu(contextMenu, graphComponent, args) {
			args.showMenu = true

			contextMenu.clearItems()

			var avPages = [1];



			if (graphComponent.selection.selectedNodes.size > 0 && graphComponent.selection.selectedEdges.size >0){
				// do nothing
			} else if (graphComponent.selection.selectedEdges.size == 1) {
				selEdges = graphComponent.selection.selectedEdges.toArray();
				contextMenu.addMenuItem('Assign to...', () => $( "#pageDialog" ).dialog( "open" ),  fillAssignDialog());

				//contextMenu.addMenuItem("tag", () => alert(selEdges[0].tag))
			} else if (graphComponent.selection.selectedNodes.size == 1) {
				//contextMenu.addMenuItem("tag", () => alert(graphComponent.selection.selectedNodes.toArray()[0].tag))

                contextMenu.addMenuItem('Set as first in the order', () => {

                    let constr = new SetAsFirst(graphComponent.selection.selectedNodes.toArray());
                    constraintsArray.push(constr)
                    $("#constraintTags").tagit("createTag", constr.getPrintable())
                });

			} else if (graphComponent.selection.selectedNodes.size == 2) {
				var nodesArr = graphComponent.selection.selectedNodes.toArray();
				var a = nodesArr[0];
				var b = nodesArr[1];
				contextMenu.addMenuItem('Make '+a+ ' predecessor to '+b, () => {
					let constr = new Predecessor(nodesArr);
					constraintsArray.push(constr)
					$("#constraintTags").tagit("createTag", constr.getPrintable())
				}),


				contextMenu.addMenuItem('Make '+b+ ' predecessor to '+a, () => {
					let constr = new Predecessor(nodesArr.reverse());
					constraintsArray.push(constr)
					$("#constraintTags").tagit("createTag", constr.getPrintable())
				}),


				contextMenu.addMenuItem('Make consecutive', () => {

					let constr = new Consecutive(nodesArr);
					constraintsArray.push(constr)
					$("#constraintTags").tagit("createTag", constr.getPrintable())
				});

				contextMenu.addMenuItem('Partial order', () =>{
					fillOrderDialog();
				})
				contextMenu.addMenuItem('Restrict the edges from ' + a + ' and ' + b, () => {
					fillRestrictDialog([a,b])
				})

			} else if (graphComponent.selection.selectedNodes.size >= 2) {
				var nodesArr = graphComponent.selection.selectedNodes.toArray();
				contextMenu.addMenuItem('Partial order', () =>{
					fillOrderDialog();
				})
				contextMenu.addMenuItem('Restrict the edges from ' + nodesArr.toString(), () => {
					fillRestrictDialog(nodesArr)
				})
			} else if (graphComponent.selection.selectedEdges.size > 1) {
				selEdges = graphComponent.selection.selectedEdges.toArray();
				contextMenu.addMenuItem('Assign to...', () => $( "#pageDialog" ).dialog( "open" ),  fillAssignDialog());
				contextMenu.addMenuItem('Assign to the same page', () => {
					var arr = []


					selEdges.forEach(function(a) {
						arr.push(a.toString())
					})
					let constr = new SamePage(selEdges);

					constraintsArray.push(constr)

					$("#constraintTags").tagit("createTag", constr.getPrintable())
				})

				var avPages = [1];

				let k;
				for(k=2; k<=numberOfPages; k++) {
					if ($("#page" + k).prop("checked")) {
						avPages.push(k);
					}
				}

                if(graphComponent.selection.selectedEdges.size <= avPages.length) {
                    contextMenu.addMenuItem('Assign to pairwise different pages', () =>{

                        var arr = []


                        selEdges.forEach(function(a) {
                            arr.push(a.toString())
                        })

                        let constr = new DifferentPages(selEdges);
                        constraintsArray.push(constr)
                        $("#constraintTags").tagit("createTag", constr.getPrintable())
                    });
                }

                if(graphComponent.selection.selectedEdges.size >= 2 && avPages.length>1) {
                    contextMenu.addMenuItem('Not all at the same page', () =>{

                        var arr = []


                        selEdges.forEach(function(a) {
                            arr.push(a.toString())
                        })

                        let constr = new NotAllInSamePage(selEdges);
                        constraintsArray.push(constr)
                        $("#constraintTags").tagit("createTag", constr.getPrintable())
                    });
                }
			}
		}


		/*
		 * For the constraint "restrict edges of..." this function populates the dialog that shows up
		 */

		function fillRestrictDialog(arr) {
			if (arr.length == 2) {
				var a = arr[0]
				var b = arr[1]
				$("#restrictEdgesDialog").append(	"<div><label class='restrictLabel2' for='allEdges'>All edges incident to " + a + " and " + b + "</label><input name='restrictEdges' type='radio' id='allEdges'>"+
						"<br><label class='restrictLabel2' for='edgesInAB'>Only those in the interval between "+ a + " and " + b +"</label><input name='restrictEdges' type='radio' id='edgesInAB'>" +
						"<br><label class='restrictLabel2' for='edgesInBA'>Only those outside the interval between "+ a + " and " + b +"</label><input name='restrictEdges' type='radio' id='edgesInBA'></div>")

						$("#allEdges").checkboxradio()
						$("#edgesInAB").checkboxradio()
						$("#edgesInBA").checkboxradio()

						$("#restrictEdgesDialog").append("<br><br>")

						var pages = getAvailablePages()
						pages.forEach(function(p) {
							$("#restrictEdgesDialog").append("<label class='restrictLabel1' for='restrictPage"+p.toString()+"'>Page "+p.toString()+"</label><input type='checkbox' id='restrictPage"+p.toString()+"'>")
							$("#restrictPage" + p.toString()).checkboxradio({
							})

						})

						$("#restrictEdgesDialog").append("<br><br><button id='applyRestriction' class='ui-button ui-widget ui-corner-all'>Apply restriction</button>" +
						"<button id='cancelRestriction' class='ui-button ui-widget ui-corner-all'>Cancel</button>")


						$("#cancelRestriction").click(function() {
							$("#restrictEdgesDialog").dialog("close")
						})

						$("#applyRestriction").click(function() {
							var checkedPages = []
							let i;
							for (i = 1; i<=4; i++) {
								if ($("#restrictPage" + i).prop("checked")) {
									checkedPages.push("P" + i)
								}
							}
							if (checkedPages.length > 0) {
								if ($("#allEdges").prop("checked")) {
									var con = new RestrictEdgesFrom([[a,b], checkedPages])
									constraintsArray.push(con)
									$("#constraintTags").tagit("createTag", con.getPrintable())
								} else if ($("#edgesInAB").prop("checked")) {
									var con = new RestrictEdgesToArc([[a,b], checkedPages])
									constraintsArray.push(con)
									$("#constraintTags").tagit("createTag", con.getPrintable())
								} else if ($("#edgesInBA").prop("checked")) {
									var con = new RestrictEdgesToArc([[b,a], checkedPages])
									constraintsArray.push(con)
									$("#constraintTags").tagit("createTag", con.getPrintable())

								}
							}

							$("#restrictEdgesDialog").dialog("close")
						})
			} else {

				$("#restrictEdgesDialog").append("<div style='font-size: 20px'>All edges incident to " + arr.toString() + " will be assigned to</div>")

				$("#restrictEdgesDialog").append("<br><br>")
				var pages = getAvailablePages()
				pages.forEach(function(p) {
					$("#restrictEdgesDialog").append("<label class='restrictLabel1' for='restrictPage"+p.toString()+"'>Page "+p.toString()+"</label><input type='checkbox' id='restrictPage"+p.toString()+"'>")
					$("#restrictPage" + p.toString()).checkboxradio({
					})

				})

				$("#restrictEdgesDialog").append("<br><br><button id='applyRestriction' class='ui-button ui-widget ui-corner-all'>Apply restriction</button>" +
				"<button id='cancelRestriction' class='ui-button ui-widget ui-corner-all'>Cancel</button>")


				$("#cancelRestriction").click(function() {
					$("#restrictEdgesDialog").dialog("close")
				})

				$("#applyRestriction").click(function() {
					var checkedPages = []
					let i;
					for (i = 1; i<=4; i++) {
						if ($("#restrictPage" + i).prop("checked")) {
							checkedPages.push("P" + i)
						}
					}

					var con = new RestrictEdgesFrom([arr, checkedPages])
					constraintsArray.push(con)
					$("#constraintTags").tagit("createTag", con.getPrintable())
					$("#restrictEdgesDialog").dialog("close")
				})

			}
			$("#restrictEdgesDialog").dialog("open")

		}

		/*
		 *
		 *  For the partial order constraint this function fills the dialog that shows up
		 *
		 */
		function fillOrderDialog() {
			let miniGraphComponent = new yfiles.view.GraphComponent("#miniGraphComponent");
			miniGraphComponent.inputMode = new yfiles.input.GraphViewerInputMode()

			$("#orderingDialog").dialog({
				width: 600,
				resizable: false,
				autoOpen: false,
				beforeClose: function( event, ui ) {
					miniGraphComponent.graph.clear()
				}
			})

			miniGraphComponent.graph.nodeDefaults.style = new yfiles.styles.ShapeNodeStyle({
				fill: '#FFA500',
				shape: 'ellipse',
				stroke: 'white',
			})

			var selNodes = graphComponent.selection.selectedNodes.toArray()
			var position = 0

			selNodes.forEach(function(n) {
				var newNode = miniGraphComponent.graph.createNodeAt(new yfiles.geometry.Point(position,0))
				miniGraphComponent.graph.addLabel(newNode, n.labels.toArray()[0].text)
				position = position + 50
			})


			miniGraphComponent.fitGraphBounds()


			$("#orderingDialog").dialog("open")



		}


		/*
		 *
		 * this initializes the grid snapping
		 *
		 */

		function initializeSnapping() {
			const graphSnapContext = new yfiles.input.GraphSnapContext({
				enabled: true,
				snapBendAdjacentSegments: false,
				snapBendsToSnapLines: false,
				snapNodesToSnapLines: false,
				snapOrthogonalMovement: false,
				snapPortAdjacentSegments: false,
				snapSegmentsToSnapLines: false
			})
			graphSnapContext.gridSnapType = yfiles.input.GridSnapTypes.ALL;
			graphComponent.inputMode.snapContext = graphSnapContext
		}



		/*
		 *
		 * this initializes the grid
		 *
		 */

		function initializeGrid() {
			// Holds Info about the grid (such as spacing)
			gridInfo = new yfiles.view.GridInfo()

			gridInfo.horizontalSpacing = 40
			gridInfo.verticalSpacing = 40


			//add grid
			grid = new yfiles.view.GridVisualCreator(gridInfo)
			grid.gridStyle = yfiles.view.GridStyle.DOTS

			graphComponent.backgroundGroup.addChild(grid)

			const graphSnapContext = graphComponent.inputMode.snapContext
			graphSnapContext.nodeGridConstraintProvider = new yfiles.input.GridConstraintProvider(gridInfo)
			graphSnapContext.bendGridConstraintProvider = new yfiles.input.GridConstraintProvider(gridInfo)
		}

		// TODO change this to less
		function updateSnapType(snaptype) {
			const graphSnapContext = graphComponent.inputMode.snapContext
			if (snaptype == 'none') {
				graphSnapContext.gridSnapType =  yfiles.input.GridSnapTypes.NONE
			}
			else if (snaptype == 'lines') {
				graphSnapContext.gridSnapType = yfiles.input.GridSnapTypes.LINES
			}
			else if (snaptype == 'points') {
				graphSnapContext.gridSnapType = yfiles.input.GridSnapTypes.GRID_POINTS
			}
			else {
				graphSnapContext.gridSnapType = yfiles.input.GridSnapTypes.ALL
			}

			graphComponent.invalidate()

		}


		/*
		 *
		 * this sets the defaults for nodes and edges
		 *
		 */

		function initializeGraphDefaults(){
			const graph = graphComponent.graph;

			/*
			 * node style
			 */

			graph.nodeDefaults.style = new yfiles.styles.ShapeNodeStyle({
				fill: '#FFA500',
				shape: 'ellipse',
				stroke: 'white',
			})



			/*
			 * edge style
			 */

			graph.edgeDefaults.style = new yfiles.styles.PolylineEdgeStyle({
				targetArrow: yfiles.styles.IArrow.NONE
			})






		}

		/*
		 *
		 * checks how many pages are available for the lin layout
		 *
		 */
		function getAvailablePages() {
			var avPages = [1];

			let k;
			for(k=2; k<=numberOfPages; k++) {
				if ($("#page" + k).prop("checked")) {
					avPages.push(k);
				}
			}
			return avPages;

		}

		/*
		 *
		 * deserializes the constraints
		 *
		 */

		function deserialize(string) {
			var type = filterStringByTag(string, "type");
			type = type[0];
			var objects = filterStringByTag(string, "objects")[0];

			switch(type) {
			case "NODES_PREDECESSOR":
				var objString = objects.split(",")
				var objItems = [];

				objString.forEach(function(os) {
					objItems = objItems.concat(findObjectByTag(os, "node"))
				})

				var con = new Predecessor(objItems)
				constraintsArray.push(con);
				$("#constraintTags").tagit("createTag", con.getPrintable() )

				break;
            case "NODES_CONSECUTIVE":
                    var objString = objects.split(",")

                    var objItems = [];

                    objString.forEach(function(os) {
                        objItems = objItems.concat(findObjectByTag(os, "node"))
                    })

                    var con = new Consecutive(objItems)
                    constraintsArray.push(con);
                    $("#constraintTags").tagit("createTag", con.getPrintable() )

                    break;
            case "NODES_SET_FIRST":
                    var objString = objects.split(",")

                    var objItems = [];

                    objString.forEach(function(os) {
                        objItems = objItems.concat(findObjectByTag(os, "node"))
                    })

                    var con = new SetAsFirst(objItems)
                    constraintsArray.push(con);
                    $("#constraintTags").tagit("createTag", con.getPrintable() )

                    break;
			case "EDGES_SAME_PAGES":
				objString = objects;
				var objString = objects.split(",")
				var objItems = [];

				objString.forEach(function(os) {
					objItems = objItems.concat(findObjectByTag(os, "edge"))
				})

				var con = new SamePage(objItems)
				constraintsArray.push(con);
				$("#constraintTags").tagit("createTag", con.getPrintable() )

				break;
                case "EDGES_DIFFERENT_PAGES":
                    var objString = objects.split(",")
                    var objItems = [];

                    objString.forEach(function(os) {
                        objItems = objItems.concat(findObjectByTag(os, "edge"))
                    })


                    var con = new DifferentPages(objItems)
                    constraintsArray.push(con);
                    $("#constraintTags").tagit("createTag", con.getPrintable() )

                    break;
                case "NOT_ALL_IN_SAME_PAGE":
                    var objString = objects.split(",")
                    var objItems = [];

                    objString.forEach(function(os) {
                        objItems = objItems.concat(findObjectByTag(os, "edge"))
                    })


                    var con = new NotAllInSamePage(objItems)
                    constraintsArray.push(con);
                    $("#constraintTags").tagit("createTag", con.getPrintable() )

                    break;
			case "EDGES_ON_PAGES":
				var objString = filterStringByTag(objects, "objectsA")[0]
				objString = objString.split(",")
				var pages = filterStringByTag(objects, "objectsB")[0]
				pages = pages.split(",")

				var objItems = [];

				objString.forEach(function(os) {
					objItems = objItems.concat(findObjectByTag(os, "edge"))
				})

				var con = new AssignedTo([objItems, pages])
				constraintsArray.push(con);
				$("#constraintTags").tagit("createTag", con.getPrintable())

				break;
			case "NODES_REQUIRE_PARTIAL_ORDER":
				var objString = objects.split(",")
				var objItems = [];

				objString.forEach(function(os) {
					objItems = objItems.concat(findObjectByTag(os, "node"))
				})
				var con = new RequirePartialOrder(objItems)
				constraintsArray.push(con)
				$("#constraintTags").tagit("createTag", con.getPrintable())
				break;
			case "NODES_FORBID_PARTIAL_ORDER":

				var objString = objects.split(",")
				var objItems = [];

				objString.forEach(function(os) {
					objItems = objItems.concat(findObjectByTag(os, "node"))
				})

				var con = new ForbidPartialOrder(objItems)
				constraintsArray.push(con)
				$("#constraintTags").tagit("createTag", con.getPrintable())
				break;
			case "EDGES_FROM_NODES_ON_PAGES":
				var objString = filterStringByTag(objects, "objectsA")[0]
				objString = objString.split(",")
				var pages = filterStringByTag(objects, "objectsB")[0]
				pages = pages.split(",")

				var objItems = [];

				objString.forEach(function(os) {
					objItems = objItems.concat(findObjectByTag(os, "node"))
				})

				var con = new RestrictEdgesFrom([objItems, pages])
				constraintsArray.push(con)
				$("#constraintTags").tagit("createTag", con.getPrintable())

				break;
			case "EDGES_TO_SUB_ARC_ON_PAGES":
				var objString = filterStringByTag(objects, "objectsA")[0]
				objString = objString.split(",")
				var pages = filterStringByTag(objects, "objectsB")[0]
				pages = pages.split(",")

				var objItems = [];

				objString.forEach(function(os) {
					objItems = objItems.concat(findObjectByTag(os, "node"))
				})


				var con = new RestrictEdgesFrom([objItems, pages])
				constraintsArray.push(con)
				$("#constraintTags").tagit("createTag", con.getPrintable())

				break;
			}
		}


		/*
		 *
		 * FINDS YOU THE OBJECT OF THE GRAPH WITH NAME "X" OF TYPE "Y"
		 *
		 * TODO i think this is useless


		function findObjectByName(name, type) {
			var toSearchIn;

			if (type == "node") {
				toSearchIn = graphComponent.graph.nodes.toArray();
			} else if (type == "edge") {
				toSearchIn = graphComponent.graph.edges.toArray();
			}

			var y = null;

			toSearchIn.forEach(function(i) {
				if (i.labels.toArray()[0].text == name) {
					y = i;
				}
			})
			return y;

		} */

		function findObjectByTag(tag, type) {
			var toSearchIn;

			if (type == "node") {
				toSearchIn = graphComponent.graph.nodes.toArray();
			} else if (type == "edge") {
				toSearchIn = graphComponent.graph.edges.toArray();
			}

			var y = null;

			toSearchIn.forEach(function(i) {
				if (i.tag  == tag) {
					y = i;
				}
			})
			return y;

		}

		/*
		 *
		 * PARSES THE FILE YOU LOAD IN
		 *
		 */

		function readFile(e) {
			var file = e.target.files[0];
			if (!file) {
				return;
			}
			var reader = new FileReader();
			reader.onload = function(e) {
				myGraph = e.target.result;

				// reset all settings:

				deleteAllConstraints();
				disableFollowingPages(2);

				var constraints = filterStringByTag(myGraph, "constraint")
				var pages = filterStringByTag(myGraph, "page")

				if (pages.length == 0) {
					var pages2 = filterStringByTag(myGraph, "pages")
					let i;
					for (i = 1; i<= parseInt(pages2[0]); i++) {
						$("#page" + i).prop("checked", true);
						$("#page" + i).button("refresh");

						$("#page" + i).checkboxradio({
							disabled: false
						})
						$("#typeP" + i).selectmenu({
							disabled: false
						})
						$("#layoutP" + i).selectmenu({
							disabled: false
						})
						$("#page" + (i+1)).checkboxradio({
							disabled: false
						})
						$("#page" + (i+1)).button("refresh")

					}

				} else {




					// load in pages
					pages.forEach(function(page) {
						var id = filterStringByTag(page, "id")[0]
						id = id.slice(1)
						var type = filterStringByTag(page, "type")
						var layout = filterStringByTag(page, "layout")

						$("#page" + id).prop("checked", true);
						$("#page" + id).button("refresh");

						$("#page" + id).checkboxradio({
							disabled: false
						})

						$("#typeP" + id).selectmenu({
							disabled: false
						})

						$("#typeP" + id).val(type)
						$("#typeP" + id).selectmenu("refresh")


						$("#layoutP" + id).selectmenu({
							disabled: false
						})
						$("#layoutP" + id).val(layout)
						$("#layoutP" + id).selectmenu("refresh")


						$("#page" + (parseInt(id)+1)).checkboxradio({
							disabled: false,
						})

					})
				}




				// load in graph
				graphMLIOHandler
				.readFromGraphMLText(graphComponent.graph, myGraph)
				.then(() => {
					graphComponent.fitGraphBounds();

					checkLabelsAndTags();


					// took out a timeout, seems to work fine
					constraints.forEach(function(c){
						deserialize(c)
					})

				})


			};
			reader.readAsText(file);

		}

		/*
		 * When a graph is loaded in, this Method checks if every node / edge has a label and a tag and if not, assigns those
		 */

		function checkLabelsAndTags() {
			var nodes = graphComponent.graph.nodes.toArray();

			nodes.forEach(function(n) {
				if (n.labels.size == 0) {
					var label = getNextLabel("node")
					graphComponent.graph.addLabel(n, label.toString())
				}
				if (n.tag == null) {
					n.tag = getNextTag()
				}
			})

			var edges = graphComponent.graph.edges.toArray();
			edges.forEach(function(e) {
				if (e.labels.size == 0) {
					var label = getNextLabel("edge")
					graphComponent.graph.addLabel(e, label.toString())
				}
				if (e.tag == null) {
					e.tag = e.sourceNode.tag + "-" +e.targetNode.tag
				}
			})

		}


		/*
		 *
		 * saves a graph as graphml including pages, page constraints, page types and further constraints
		 * parameter: filename, string
		 *
		 */
		function saveFile(filename) {
			if (filename == "") {
				filename = "unnamed"
			}

			graphMLIOHandler
			.write(graphComponent.graph)
			.then(result => myGraph=result);

			setTimeout(function(){

				myGraph = myGraph.slice(0,-10)

				myGraph = myGraph + "\t<pages>"

				var pages = getAvailablePages()
				pages.forEach(function(p) {
					myGraph = myGraph + "\r\n\t\t<page>"
					myGraph = myGraph + "\r\n\t\t\t<id>P" + p + "</id>"
					myGraph = myGraph + "\r\n\t\t\t<type>" + $("#typeP" + p).val() + "</type>"
					myGraph = myGraph + "\r\n\t\t\t<layout>" + $("#layoutP" + p).val() + "</layout>"
					myGraph = myGraph + "\r\n\t\t</page>"

				})
				myGraph = myGraph  + "\r\n\t</pages>\r\n\t<constraints>\r\n"


				constraintsArray.forEach(function(c) {
					myGraph = myGraph  + c.serialize() + "\r\n"
				})

				myGraph = myGraph + "\t</constraints>\r\n</graphml>"

				FileSaveSupport.save(myGraph, filename+".graphml")

			}, 1);


		}



		/*
		 *
		 * this function connects the html-buttons with their functionalities
		 *
		 */
		function registerCommands(){


			/*
			 * file tab
			 */

			document.querySelector("#NewButton").addEventListener("click", () => {
				graphComponent.graph.clear();
				deleteAllConstraints();
				disableFollowingPages(2);
				deselectPage(2);
				yfiles.input.ICommand.FIT_GRAPH_BOUNDS.execute(null, graphComponent);

			})

			document.getElementById('OpenButton').addEventListener('change', readFile, false);


			document.querySelector("#SaveDialogButton").addEventListener("click", () => {
				$("#saveDialog").dialog("open")
			})


			document.querySelector("#saveButton").addEventListener("click", () => {
				saveFile($("#fileName").val());
				$("#saveDialog").dialog("close")
			})

			document.querySelector("#cancelSaveDialog").addEventListener("click", () => {
				$("#saveDialog").dialog("close")
			})

			document.querySelector("#ServerButton").addEventListener("click", () => {
				if (typeof(window.localStorage) !== "undefined") {
					$("#serverDialog").dialog("open")
				} else {
					alert("This browser does not support local storage, which leads to problems with computation. Please consider using another browser or stay with the standard server.")
				}
			})

			document.querySelector("#okChangeServer").addEventListener("click", () => {
				var newurl = $("#serverUrl").val()

				if (newurl.split("")[newurl.length-1] == "/") {
					newurl = newurl.split("")
					newurl.pop()
					newurl = newurl.join("")
				}

				// check if server is answering correctly
				$.ajax({
					url: newurl + "/embeddings",
					success: function() {
						document.getElementById("displayCurrentServer").innerHTML = newurl;
						window.localStorage.setItem("currentServer", newurl)
					},
					error: function() {
						alert("This server does not host functionality for computation of linear layouts. Please try a different server.")
					}
				})


				$("#serverDialog").dialog("close")
			})

			document.querySelector("#abortChangeServer").addEventListener("click", () => {
				$("#serverDialog").dialog("close")
			})

			document.querySelector("#resetServer").addEventListener("click", () => {
				window.localStorage.setItem("currentServer", standardServer)
				document.getElementById("displayCurrentServer").innerHTML = currentServer;
				$("#serverDialog").dialog("close")
			})

			/*
			 * edit tab
			 */



			document.querySelector("#UndoButton").addEventListener("click", () => {
				yfiles.input.ICommand.UNDO.execute({target: graphComponent});
			})

			document.querySelector("#RedoButton").addEventListener("click", () => {
				yfiles.input.ICommand.REDO.execute({target: graphComponent});
			})

			document.querySelector("#SelectAllButton").addEventListener("click", () => {
				yfiles.input.ICommand.SELECT_ALL.execute({target: graphComponent});
			})


			document.querySelector("#CopyButton").addEventListener("click", () => {
				yfiles.input.ICommand.COPY.execute({target: graphComponent});
			})

			document.querySelector("#CutButton").addEventListener("click", () => {
				yfiles.input.ICommand.CUT.execute({target: graphComponent});
			})

			document.querySelector("#PasteButton").addEventListener("click", () => {
				yfiles.input.ICommand.PASTE.execute({target: graphComponent});
			})

			document.querySelector("#DeleteButton").addEventListener("click", () => {
				//
				yfiles.input.ICommand.DELETE.execute({target: graphComponent});

			})

			document.querySelector("#yesDelete").addEventListener("click", () => {
				var selection = graphComponent.selection;
				var adjEdges = [];

				var delNodes = selection.selectedNodes.toArray();
				delNodes.forEach(function(node) {
					var arr = graphComponent.graph.edgesAt(node).toArray();
					arr.forEach(function(edge) {
						adjEdges.push(edge)
					})

				})

				var delItems = selection.toArray();
				delItems = delItems.concat(adjEdges)

				delItems.forEach(function(item){
					deleteRelatedConstraintsDeluxe(item);
				})

				graphComponent.inputMode.deleteSelection()
				$("#deleteDialog").dialog("close");
			})

			document.querySelector("#noDontDelete").addEventListener("click", () => {
				$("#deleteDialog").dialog("close");
			})



			/*
			 * view tab
			 */

			document.querySelector("#ZoomInButton").addEventListener("click", () => {
				yfiles.input.ICommand.INCREASE_ZOOM.execute({target: graphComponent});
			})

			document.querySelector("#ZoomOutButton").addEventListener("click", () => {
				yfiles.input.ICommand.DECREASE_ZOOM.execute({target: graphComponent});
			})

			document.querySelector("#FitButton").addEventListener("click", () => {
				yfiles.input.ICommand.FIT_GRAPH_BOUNDS.execute({target: graphComponent});
			})


			document.querySelector('#GridButton').addEventListener("click", () => {
				grid.visible = !grid.visible;
				if (grid.visible) {
					updateSnapType('all')
				} else {
					updateSnapType('none')
				}
				graphComponent.invalidate();

			})



			document.querySelector('#marqueeAll').addEventListener("click", () => {
				changeSelectionMode('all')
			})

			document.querySelector('#marqueeNodes').addEventListener("click", () => {
				changeSelectionMode('nodes')
			})
			document.querySelector('#marqueeEdges').addEventListener("click", () => {
				changeSelectionMode('edges')
			})

			/* Layout Tab */

			document.querySelector("#hierLayoutButton").addEventListener("click", () => {
				resetToPolylineStyle();
				graphComponent.morphLayout(new yfiles.hierarchic.HierarchicLayout());
				graphComponent.fitGraphBounds();
			})
			document.querySelector("#organicLayoutButton").addEventListener("click", () => {
				resetToPolylineStyle();
				graphComponent.morphLayout(new yfiles.organic.OrganicLayout());
				graphComponent.fitGraphBounds();
			})
			document.querySelector("#orthoLayoutButton").addEventListener("click", () => {
				resetToPolylineStyle();
				graphComponent.morphLayout(new yfiles.orthogonal.OrthogonalLayout());
				graphComponent.fitGraphBounds();
			})
			document.querySelector("#circLayoutButton").addEventListener("click", () => {
				resetToPolylineStyle();
				graphComponent.morphLayout(new yfiles.circular.CircularLayout());
				graphComponent.fitGraphBounds();
			})

			document.querySelector("#treeLayoutButton").addEventListener("click", () => {
				resetToPolylineStyle();
				const treeLayout = new yfiles.tree.TreeLayout();
				const treeReductionStage = new yfiles.tree.TreeReductionStage();

				//specify the routing algorithm for the non-tree edges
				const router = new yfiles.router.EdgeRouter();
				router.scope = yfiles.router.Scope.ROUTE_AFFECTED_EDGES;
				treeReductionStage.nonTreeEdgeRouter = router;
				treeReductionStage.nonTreeEdgeSelectionKey = router.affectedEdgesDpKey;

				treeLayout.appendStage(treeReductionStage);
				graphComponent.morphLayout(treeLayout);
				treeLayout.removeStage(treeReductionStage);

				graphComponent.fitGraphBounds();

			})
			document.querySelector("#balloonLayoutButton").addEventListener("click", () => {
				resetToPolylineStyle();
				const treeLayout = new yfiles.tree.BalloonLayout();
				const treeReductionStage = new yfiles.tree.TreeReductionStage();

				//specify the routing algorithm for the non-tree edges
				const router = new yfiles.router.EdgeRouter();
				router.scope = yfiles.router.Scope.ROUTE_AFFECTED_EDGES;
				treeReductionStage.nonTreeEdgeRouter = router;
				treeReductionStage.nonTreeEdgeSelectionKey = router.affectedEdgesDpKey;

				treeLayout.appendStage(treeReductionStage);
				graphComponent.morphLayout(treeLayout);
				treeLayout.removeStage(treeReductionStage);

				graphComponent.fitGraphBounds();

			})
			document.querySelector("#radialLayoutButton").addEventListener("click", () => {
				resetToPolylineStyle();
				graphComponent.morphLayout(new yfiles.radial.RadialLayout());
				graphComponent.fitGraphBounds();
			})


			/* Tools Tab */
			document.querySelector("#resizableNodes").addEventListener("click", () => {
				nodesStableSize = !nodesStableSize;

				if (nodesStableSize) {
					graphComponent.inputMode.showHandleItems = yfiles.graph.GraphItemTypes.ALL & ~yfiles.graph.GraphItemTypes.NODE;
				} else if (!nodesStableSize) {
					graphComponent.inputMode.showHandleItems = yfiles.graph.GraphItemTypes.ALL;
				}

			})

			document.querySelector("#doubleEdges").addEventListener("click", () => {
				allowDoubleEdges = !allowDoubleEdges;
			})


			document.querySelector("#stellation").addEventListener("click", () => {

				var selectedNodes = graphComponent.selection.selectedNodes.toArray();

				if (selectedNodes.length == 0) {
					const adapter = new yfiles.layout.YGraphAdapter(graphComponent.graph);
					var ygraph = adapter.yGraph;

					if (!yfiles.algorithms.PlanarEmbedding.isPlanar(ygraph))
					{
						alert("The input graph cannot be stellated because it is not planar.");
					}
					var planarEmbedding = new yfiles.algorithms.PlanarEmbedding(ygraph);
					var outerFace = planarEmbedding.outerFace;

					var alreadyStellated =[];

					planarEmbedding.faces.forEach(face => {
							var x = 0;
							var y = 0;

							var stellate = graphComponent.graph.createNode({
								layout: new yfiles.geometry.Rect(0,0,20,20),
								tag: getNextTag()
							});
							graphComponent.graph.addLabel(stellate, getNextLabel("node").toString());

							face.forEach(dart => {
								const source =  adapter.getOriginalNode(dart.reversed ? dart.associatedEdge.source : dart.associatedEdge.target);
								const e = graphComponent.graph.createEdge({
									source: source,
									target: stellate,
									tag: source.tag+"-"+stellate.tag
								});
								graphComponent.graph.addLabel(e, getNextLabel("edge").toString())
								x = x + source.layout.center.x;
								y = y + source.layout.center.y;
							});
							x = x / face.size;
							y = y / face.size;
							graphComponent.graph.setNodeCenter(stellate, new yfiles.geometry.Point(x, y));

					});


				} else {
					var x = 0;
					var y = 0;

					var stellate = graphComponent.graph.createNode({
						layout: new yfiles.geometry.Rect(0,0,20,20),
						tag: getNextTag()
					});
					graphComponent.graph.addLabel(stellate, getNextLabel("node").toString());

					selectedNodes.forEach(node => {
						x = x + node.layout.center.x;
						y = y + node.layout.center.y;

						const e = graphComponent.graph.createEdge({
							source: node,
							target: stellate,
							tag: node.tag+"-"+stellate.tag
						});
						graphComponent.graph.addLabel(e, getNextLabel("edge").toString())
					})
					x = x / selectedNodes.length;
					y = y / selectedNodes.length;
					graphComponent.graph.setNodeCenter(stellate, new yfiles.geometry.Point(x, y));
				}
			})



			document.querySelector("#threeStellation").addEventListener("click", () => {
				var selectedNodes = graphComponent.selection.selectedNodes.toArray();

				if (selectedNodes.length < 3) {
					const adapter = new yfiles.layout.YGraphAdapter(graphComponent.graph);
					var ygraph = adapter.yGraph;

					if (!yfiles.algorithms.PlanarEmbedding.isPlanar(ygraph))
					{
						alert("The input graph cannot be stellated because it is not planar.");
					}
					var planarEmbedding = new yfiles.algorithms.PlanarEmbedding(ygraph);
					var outerFace = planarEmbedding.outerFace;


					planarEmbedding.faces.forEach(function(face) {
						if (face.size == 3) {
							var x = 0;
							var y = 0;

							face.forEach(function(dart) {
								const source =  adapter.getOriginalNode(dart.reversed ? dart.associatedEdge.source : dart.associatedEdge.target);
								x = x + source.layout.center.x;
								y = y + source.layout.center.y;
							})

							x = x / face.size
							y = y / face.size

							// create 3 new nodes
							var s1 = graphComponent.graph.createNode({
								layout: new yfiles.geometry.Rect(x,y,20,20),
								tag: getNextTag()
							})
							graphComponent.graph.addLabel(s1, getNextLabel("node").toString());

							var s2 = graphComponent.graph.createNode({
								layout: new yfiles.geometry.Rect(x,y,20,20),
								tag: getNextTag()
							})
							graphComponent.graph.addLabel(s2, getNextLabel("node").toString());

							var s3 = graphComponent.graph.createNode({
								layout: new yfiles.geometry.Rect(x,y,20,20),
								tag: getNextTag()
							})
							graphComponent.graph.addLabel(s3, getNextLabel("node").toString());


							// create 3 new edges
							var e1 = graphComponent.graph.createEdge({
								source: s1,
								target: s2,
								tag: s1.tag+"-"+s2.tag
							})
							graphComponent.graph.addLabel(e1, getNextLabel("edge").toString())

							var e2 = graphComponent.graph.createEdge({
								source: s2,
								target: s3,
								tag: s2.tag+"-"+s3.tag
							})
							graphComponent.graph.addLabel(e2, getNextLabel("edge").toString())

							var e3 = graphComponent.graph.createEdge({
								source: s1,
								target: s3,
								tag: s1.tag+"-"+s3.tag
							})
							graphComponent.graph.addLabel(e3, getNextLabel("edge").toString())


							// create 6 new edges,2 for each dart
							var edgesToNewNodes = [[s1, s2],[s3,s1],[s2,s3]]
							var i = 0;

							face.forEach(function(dart) {
								const source =  adapter.getOriginalNode(dart.reversed ? dart.associatedEdge.source : dart.associatedEdge.target);
								var ea = graphComponent.graph.createEdge({
									source: source,
									target: edgesToNewNodes[i][0],
									tag: source.tag + "-(0)-" + edgesToNewNodes[i][0].tag,
								})
								graphComponent.graph.addLabel(ea, getNextLabel("edge").toString())

								var eb = graphComponent.graph.createEdge({
									source: source,
									target: edgesToNewNodes[i][1],
									tag: source.tag + "-(0)-" + edgesToNewNodes[i][1].tag
								})
								graphComponent.graph.addLabel(eb, getNextLabel("edge").toString())



								i++;
							})

						}
					})
				} else if (selectedNodes.length == 3) {
					var x = 0;
					var y = 0;

					selectedNodes.forEach(function(n) {
						x = x + n.layout.center.x;
						y = y + n.layout.center.y;
					})

					x = x / selectedNodes.length
					y = y / selectedNodes.length

					// create 3 new nodes
					var s1 = graphComponent.graph.createNode({
						layout: new yfiles.geometry.Rect(x,y,20,20),
						tag: getNextTag()
					})
					graphComponent.graph.addLabel(s1, getNextLabel("node").toString());

					var s2 = graphComponent.graph.createNode({
						layout: new yfiles.geometry.Rect(x,y,20,20),
						tag: getNextTag()
					})
					graphComponent.graph.addLabel(s2, getNextLabel("node").toString());

					var s3 = graphComponent.graph.createNode({
						layout: new yfiles.geometry.Rect(x,y,20,20),
						tag: getNextTag()
					})
					graphComponent.graph.addLabel(s3, getNextLabel("node").toString());

					// create 3 new edges
					var e1 = graphComponent.graph.createEdge({
						source: s1,
						target: s2,
						tag: s1.tag+"-"+s2.tag
					})
					graphComponent.graph.addLabel(e1, getNextLabel("edge").toString())

					var e2 = graphComponent.graph.createEdge({
						source: s2,
						target: s3,
						tag: s2.tag+"-"+s3.tag
					})
					graphComponent.graph.addLabel(e2, getNextLabel("edge").toString())

					var e3 = graphComponent.graph.createEdge({
						source: s1,
						target: s3,
						tag: s1.tag+"-"+s3.tag
					})
					graphComponent.graph.addLabel(e3, getNextLabel("edge").toString())

					// create 6 new edges,2 for each dart
					var edgesToNewNodes = [[s1, s2],[s3,s1],[s2,s3]]
					var i = 0;

					selectedNodes.forEach(function(n) {
						var ea = graphComponent.graph.createEdge({
							source: n,
							target: edgesToNewNodes[i][0],
							tag: n.tag + "-(0)-" + edgesToNewNodes[i][0].tag,
						})
						graphComponent.graph.addLabel(ea, getNextLabel("edge").toString())

						var eb = graphComponent.graph.createEdge({
							source: n,
							target: edgesToNewNodes[i][1],
							tag: n.tag + "-(0)-" + edgesToNewNodes[i][1].tag
						})
						graphComponent.graph.addLabel(eb, getNextLabel("edge").toString())


						i++;
					})

				}
			})



			document.querySelector("#edgeStellation").addEventListener("click", () => {
				var selectedEdges = graphComponent.selection.selectedEdges.toArray();
				var selectedNodes = graphComponent.selection.selectedNodes.toArray();

				if (selectedEdges.length != 0) {
					selectedEdges.forEach(function(e) {
						stellateEdge(e)
					})
				}

				if (selectedEdges.length == 0) {
					var edges = graphComponent.graph.edges.toArray();
					edges.forEach(function(e) {
						stellateEdge(e)
					})
				}

			})







			/*Submit Dialog Button*/
			document.querySelector("#submitButton").addEventListener("click", () => {
				$("#computeDialog").dialog("open")
			})

			document.querySelector("#yesCompute").addEventListener("click", () => {
				$("#computeDialog").dialog("close")
				$("#loadingDiv").show()
				computeLinearLayout()
			})

			document.querySelector("#noCompute").addEventListener("click", () => {
				$("#computeDialog").dialog("close")
			})

			document.querySelector("#yesCompute2").addEventListener("click", () => {
				$("#computeDialog").dialog("close")
				computeLinearLayout()
			})

			document.querySelector("#noCompute2").addEventListener("click", () => {
				$("#computeDialog").dialog("close")
			})

			document.querySelector("#yesSaveCompute").addEventListener("click", () =>{

				$("#computeDialog").dialog("close")
				$("#saveDialog").dialog("open")

			})

			document.querySelector("#okayWentWrong").addEventListener("click", () => {
				$("#wentWrong").dialog("close")
				$("#loadingDiv").hide()
			})




			/*Export Dialog*/

			document.querySelector('#ExportAsImage').addEventListener("click", () => {
				const scale = parseFloat(1)
				const margin = parseFloat(5)

				clientSideImageExport = new ClientSideImageExport();

				clientSideImageExport.scale = scale
				clientSideImageExport.margins = new yfiles.geometry.Insets(margin)

				clientSideImageExport
				.exportImage(graphComponent.graph, null)
				.then(pngImage => {
					FileSaveSupport.save(pngImage.src, 'graph.png')
				})

				$("#exportDialog").dialog("close");
			})

			document.querySelector('#ExportAsPdf').addEventListener("click", () => {
				clientSidePdfExport = new ClientSidePdfExport()

				const scale = parseFloat(1)
				const margin = parseFloat(5)

				clientSidePdfExport.scale = scale
				clientSidePdfExport.margins = new yfiles.geometry.Insets(margin)

				clientSidePdfExport.exportPdf(graphComponent.graph, null). then(pdfUrl => {
					FileSaveSupport.save(pdfUrl, 'graph.pdf')
				}).catch(() => {
					alert(
							'Saving directly to the filesystem is not supported by this browser. Make sure to save your graph and try with another browser'
					)
				})

				$("#exportDialog").dialog("close");

			})

			// Order Dialog
			$("#requireOrder").click(function() {
				var constr = new RequirePartialOrder(graphComponent.selection.selectedNodes.toArray())
				constraintsArray.push(constr)
				$("#constraintTags").tagit("createTag", constr.getPrintable())
				$("#orderingDialog").dialog("close")
			})

			$("#forbidOrder").click(function() {
				var constr = new ForbidPartialOrder(graphComponent.selection.selectedNodes.toArray())
				constraintsArray.push(constr)
				$("#constraintTags").tagit("createTag", constr.getPrintable())
				$("#orderingDialog").dialog("close")
			})

			// Stats Dialog
			$("#statsButton").click(function() {
				var graph = graphComponent.graph
				const adapter = new yfiles.layout.YGraphAdapter(graphComponent.graph);
				var ygraph = adapter.yGraph

				var nrOfVertices = graph.nodes.size
				var nrOfEdges = graph.edges.size
				var isPlanar =  yfiles.algorithms.PlanarEmbedding.isPlanar(ygraph)
				var isConnected = yfiles.algorithms.GraphChecker.isConnected(ygraph)

				var cyclePath = yfiles.algorithms.Cycles.findCycle(ygraph, false)
				var isAcyclic;
				if (cyclePath.size == 0) {
					isAcyclic = true;
				} else {
					isAcyclic = false;
				}

				var isTree = yfiles.algorithms.Trees.isTree(ygraph)
				var isBipartite = yfiles.algorithms.GraphChecker.isBipartite(ygraph)

				document.getElementById("nrOfVertices").innerHTML =  nrOfVertices
				document.getElementById("nrOfEdges").innerHTML = nrOfEdges
				document.getElementById("isPlanar").innerHTML = isPlanar
				if (isPlanar) {document.getElementById("isPlanar").style.color = "green"} else {document.getElementById("isPlanar").style.color = "red"}
				document.getElementById("isConnected").innerHTML = isConnected
				if (isConnected) {document.getElementById("isConnected").style.color = "green"} else {document.getElementById("isConnected").style.color = "red"}
				document.getElementById("isAcyclic").innerHTML = isAcyclic
				if (isAcyclic) {document.getElementById("isAcyclic").style.color = "green"} else {document.getElementById("isAcyclic").style.color = "red"}
				document.getElementById("isTree").innerHTML = isTree
				if (isTree) {document.getElementById("isTree").style.color = "green"} else {document.getElementById("isTree").style.color = "red"}

				document.getElementById("isBipartite").innerHTML = isBipartite
				if (isBipartite) {document.getElementById("isBipartite").style.color = "green"} else {document.getElementById("isBipartite").style.color = "red"}


				$("#statsDialog").dialog("open")
			})


		}


		/*
		 * This function stellates an edge, meaning that it places a node somewhere above or below the edge and connects source and target of the edge with two new edges
		 */

		// TODO change edge tags here DONE

		function stellateEdge(e) {
			var xsourceNode = e.sourceNode.layout.center.x
			var xtargetNode = e.targetNode.layout.center.x
			var ysourceNode = e.sourceNode.layout.center.y
			var ytargetNode = e.targetNode.layout.center.y


			var xnew = xsourceNode + 0.5*(xtargetNode-xsourceNode)
			var ynew = ysourceNode + 0.5*(ytargetNode-ysourceNode)

			var width = e.sourceNode.layout.width
			var height = e.sourceNode.layout.height

			var newNode = graphComponent.graph.createNodeAt(new yfiles.geometry.Point(xnew+30, ynew+30))
			var edge1 = graphComponent.graph.createEdge(newNode, e.sourceNode)
			var edge2 = graphComponent.graph.createEdge(newNode, e.targetNode)

			// adding labels and tags
			var nodeLabel = getNextLabel("node");
			graphComponent.graph.addLabel(newNode, nodeLabel.toString())
			newNode.tag = getNextTag();

			var edge1Label = getNextLabel("edge");
			graphComponent.graph.addLabel(edge1, edge1Label.toString())
			edge1.tag = edge1.sourceNode.tag + "-(0)-" + edge1.targetNode.tag

			var edge2Label = getNextLabel("edge");
			graphComponent.graph.addLabel(edge2, edge2Label.toString())
			edge1.tag = edge2.sourceNode.tag + "-(0)-" + edge2.targetNode.tag
		}

		/*
		 * iterates over the whole graph and resets every edge to polyline-stlye (black, straight line)
		 */

		function resetToPolylineStyle() {
			graphComponent.graph.edges.forEach(edge => {
				graphComponent.graph.setStyle(edge, new yfiles.styles.PolylineEdgeStyle())
			})
		}


		/*
		 *  Sends the data created by "createDataForCalculation" to the current (!) server and forwards the user to the view page
		 */

		function computeLinearLayout() {
			var graph;
			var responseID = -1;

			graphMLIOHandler
			.write(graphComponent.graph)
			.then(result => graph = result);

			setTimeout(function() {

				var graphEncoded64 = btoa(graph);

				var data = JSON.stringify(createDataForCalculation(graphEncoded64))

				var currentServer = window.localStorage.getItem("currentServer")

				if (currentServer == null) {
					currentServer = standardServer;
				} else {
					currentServer = currentServer + "/embeddings"
				}

				var settings = {
						//"async": true,
						"crossDomain": true,
						"url": currentServer + "?async=true",
						"method": "POST",
						"headers": {
							"content-type": "application/json"
						},
						"success": function(response, status) {
							redirection(response.id)
						},
						"processData": false,
						"error": function(jqXHR) {
							$("#errorMessage").html("error: " + jqXHR.responseJSON.message)
							$("#wentWrong").dialog("open")},
						"data": data
				}


				$.ajax(settings);




			},2)

		}

		function redirection(id) {
			location.href = "linearlayout.html#" + id
		}

		/*
		 * creates the "data"-element that is needed by the ajax function
		 */

		// TODO ARE ALL THE CONSTRAINT IN THERE???
		function createDataForCalculation(graph) {

			var constraints = []
			constraintsArray.forEach(function(c) {

				if (c.type =="EDGES_ON_PAGES") {

					var constraintArguments = []
					c.getObjects()[0].forEach(function(o) {
						constraintArguments.push(o.tag.toString())
					})
					var constr = {
						"arguments": constraintArguments,
						"modifier": c.getObjects()[1],
						"type": c.getType()
					}
				} else if (c.type == "NODES_PREDECESSOR") {
					var constr = {
							"arguments": [c.getObjects()[0].tag.toString()],
							"modifier": [c.getObjects()[1].tag.toString()],
							"type": c.getType()
					}

				} else if (c.type == "EDGES_FROM_NODES_ON_PAGES") {
					var constraintArguments = []
					c.getObjects()[0].forEach(function(o) {
						constraintArguments.push(o.tag.toString())
					})
					var modifiers = []
					c.getObjects()[1].forEach(function(m) {
						modifiers.push(m.toString())
					})
					var constr = {
						"arguments": constraintArguments,
						"modifier": modifiers,
						"type": c.getType()
					}
				} else if (c.type == "EDGES_TO_SUB_ARC_ON_PAGES") {
					var constraintArguments = []
					c.getObjects()[0].forEach(function(o) {
						constraintArguments.push(o.tag.toString())
					})

					var modifiers = []
					c.getObjects()[1].forEach(function(m) {
						modifiers.push(m.toString())
					})
					var constr = {
						"type": c.getType(),
						"arguments": constraintArguments,
						"modifier": modifiers,
					}
				} else {
					var constraintArguments = []
					c.getObjects().forEach(function(o) {
						constraintArguments.push(o.tag.toString())
					})
					var constr = {
						"type": c.getType(),
						"arguments": constraintArguments,
						"modifier": [],
					}
				}
				constraints.push(constr)
			})

			var pages = []
			var avPages = getAvailablePages();
			avPages.forEach(function(p) {
				var page = {
						"constraint": $("#layoutP"+p).val(),
						"type": $("#typeP"+p).val(),
						"id": "P" + p
				}
				pages.push(page)
			})

			var data =  {
				"constraints": constraints,
				"graph": graph,
				"pages": pages

			}

			return data;
		}



		/*
		 * After a redirection to #ll+id this function interprets the graph as a linear layout
		 */

		function interpretResultAsLinearLayout(object) {

			// arranges the nodes according to the calculated linear layout
			var orderedNodes = object.vertex_order
			var nodes = graphComponent.graph.nodes.toArray()

			var position = 0;

			orderedNodes.forEach(function(n) {
				nodes.forEach(function(gn) {

					if (gn.tag.toString() == n) {
						var height = gn.layout.height;
						var width = gn.layout.width;
						graphComponent.graph.setNodeLayout(gn, new yfiles.geometry.Rect(position, 0, width, height))
					}
				})
				position = position + 200;
			})


			// rearranging the edges if necessary to have the arcs of the linear layout in the right orientation (swapping source and target if necessary)

			var edges = graphComponent.graph.edges.toArray()
			edges.forEach(function(e) {

				// correcting the ports if necessary
				graphComponent.graph.setPortLocation(e.sourcePort, e.sourceNode.layout.center)
				graphComponent.graph.setPortLocation(e.targetPort, e.targetNode.layout.center)

				// swapping source and target of edge in order to make them all go in the right direction if necessary
				if (orderedNodes.indexOf(e.sourceNode.tag.toString()) > orderedNodes.indexOf(e.targetNode.tag.toString())) {
					var newEdge = graphComponent.graph.createEdge({
						source: e.targetNode,
						target: e.sourceNode,
						tag: e.tag
					})

					// assign label of old edge to new edge
					var oldLabel = e.labels.toArray()[0].text
					var newLabel = graphComponent.graph.addLabel(newEdge, oldLabel)


					const edgeSegmentLabelModelx = new yfiles.graph.EdgeSegmentLabelModel()
					edgeSegmentLabelModelx.offset = 10
					edgeSegmentLabelModelx.autoRotation = false;
					graphComponent.graph.setLabelLayoutParameter(
							newLabel,
							edgeSegmentLabelModelx.createParameterFromCenter({
								sideOfEdge: "ABOVE_EDGE",
							})
					)

					// remove old edge
					graphComponent.graph.remove(e)
				}


			})

			// registering which edges go on which pages
			var assignments = object.assignments

			assignments.forEach(function(a) {
				var arrayLocation = a.page.slice(1)
				arrayLocation = arrayLocation-1;



				// TODO change tags here NOT NECESSARY


				var edges = graphComponent.graph.edges.toArray()
				edges.forEach(function(e) {
					var reversestring = a.edge.split("-").reverse().join("-");

					if (a.edge == e.tag.toString()) {
						pagesArray[arrayLocation].push(e)
					} else if (reversestring == e.tag.toString()) {
						pagesArray[arrayLocation].push(e)
					}
				})
			})


			// assigns the colors to the edges for easier observation

			var colors = ["#FF0000", "#0000FF", "#00FF00", "#000000"]
			let i;
			for (i = 0; i< 4; i++) {
				pagesArray[i].forEach(function(e) {
					if (i % 2 != 0) {
						graphComponent.graph.setStyle(e, createArcStyle(getArcHeight(e), colors[i]))
					} else {
						graphComponent.graph.setStyle(e, createArcStyle(-getArcHeight(e), colors[i]))

					}
				})
			}


			// interpret constraints
			loadConstraintsFromJSON(object.constraints)


			// updates the pages with constraints
			var pages = object.pages
			pages.forEach(function(p) {
				var id = p.id.slice(1)
				$("#page" + id).prop("checked", true);
				$("#page" + id).button("refresh");

				$("#page" + id).checkboxradio({
					disabled: false
				})

				$("#typeP" + id).selectmenu({
					disabled: false
				})


				$("#typeP" + id).val(p.type)
				$("#typeP" + id).selectmenu("refresh")


				$("#layoutP" + id).selectmenu({
					disabled: false
				})
				$("#layoutP" + id).val(p.constraint)
				$("#layoutP" + id).selectmenu("refresh")


				$("#page" + (parseInt(id)+1)).checkboxradio({
					disabled: false
				})

			})

			graphComponent.fitGraphBounds();
		}


		/*
		 * creates the Arc Edge Style for a linear layout
		 */
		function createArcStyle(height, color) {
			return new yfiles.styles.ArcEdgeStyle({
				height: height,
				stroke: color
			})
		}



		/*
		 * calculates individual arc height for each edge
		 */
		function getArcHeight(edge) {
			const source = edge.sourceNode.layout.center
			const target = edge.targetNode.layout.center

			const distance = source.distanceTo(target)

			return Math.abs(distance/5)
		}



		/*
		 * After a redirection to #or+id this function displays the graph and registers constraints etc.
		 */
		function interpretResultAsRegularLayout(object) {
			graphComponent.fitGraphBounds();

			// load in the constraints and pages
			loadConstraintsFromJSON(object.constraints)


			// updates pages and page constraints
			var pages = object.pages
			pages.forEach(function(p) {
				var id = p.id.slice(1)
				$("#page" + id).prop("checked", true);
				$("#page" + id).button("refresh");

				$("#page" + id).checkboxradio({
					disabled: false
				})

				$("#typeP" + id).selectmenu({
					disabled: false
				})


				$("#typeP" + id).val(p.type)
				$("#typeP" + id).selectmenu("refresh")


				$("#layoutP" + id).selectmenu({
					disabled: false
				})

				$("#layoutP" + id).val(p.constraint)
				$("#layoutP" + id).selectmenu("refresh")


				$("#page" + (parseInt(id)+1)).checkboxradio({
					disabled: false
				})
			})


			// Show colors of linear layout for easier observation
			if (object.assignments != null) {
				setTimeout(function() {
					var assignments = object.assignments

					assignments.forEach(function(a) {
						var arrayLocation = a.page.slice(1)
						arrayLocation = arrayLocation-1;

						var edges = graphComponent.graph.edges.toArray()
						edges.forEach(function(e) {
							if (a.edge == e.tag.toString()) {
								pagesArray[arrayLocation].push(e)
							}
						})
					})



					var colors = ["#FF0000", "#0000FF", "#00FF00", "#000000"]
					let i;
					for (i = 0; i< 4; i++) {
						pagesArray[i].forEach(function(e) {
							var polyStyle = new yfiles.styles.PolylineEdgeStyle({
								stroke: colors[i]
							})

							graphComponent.graph.setStyle(e, polyStyle)
						})
					}
				},20)

			}
		}


		// translates constraints in json to constraints usable by the gui
		function loadConstraintsFromJSON(constraints) {
			constraints.forEach(function(c) {

				switch(c.type) {
				case "NODES_PREDECESSOR":
					var objItems = []

					// for all arguments search through all nodes to connect them to the constraint
					c.arguments.forEach(function(a) {
						graphComponent.graph.nodes.toArray().forEach(function(n) {
							if (n.tag == a) {
								objItems.push(n)
							}
						})
					})

					// for all modifiers do the same
					c.modifier.forEach(function(m) {
						graphComponent.graph.nodes.toArray().forEach(function(n) {
							if (n.tag == m) {
								objItems.push(n)
							}
						})
					})

					var con = new Predecessor(objItems)
					constraintsArray.push(con);
					$("#constraintTags").tagit("createTag", con.getPrintable())

					break;
                    case "NODES_CONSECUTIVE":
                        var objItems = []

                        c.arguments.forEach(function(a) {
                            graphComponent.graph.nodes.toArray().forEach(function(n) {
                                if (n.tag == a) {
                                    objItems.push(n)
                                }
                            })
                        })

                        var con = new Consecutive(objItems)
                        constraintsArray.push(con);
                        $("#constraintTags").tagit("createTag", con.getPrintable() )

                        break;
                    case "NODES_SET_FIRST":
                        var objItems = []

                        c.arguments.forEach(function(a) {
                            graphComponent.graph.nodes.toArray().forEach(function(n) {
                                if (n.tag == a) {
                                    objItems.push(n)
                                }
                            })
                        })

                        var con = new SetAsFirst(objItems)
                        constraintsArray.push(con);
                        $("#constraintTags").tagit("createTag", con.getPrintable() )

                        break;
				case "EDGES_SAME_PAGES":
					var objItems = [];

					c.arguments.forEach(function(a) {
						graphComponent.graph.edges.toArray().forEach(function(e) {
							if (e.tag == a) {
								objItems.push(e)
							}
						})
					})

					var con = new SamePage(objItems)
					constraintsArray.push(con);
					$("#constraintTags").tagit("createTag", con.getPrintable() )

					break;
                    case "EDGES_DIFFERENT_PAGES":
                        var objItems = [];

                        c.arguments.forEach(function(a) {
                            graphComponent.graph.edges.toArray().forEach(function(e) {
                                if (e.tag == a) {
                                    objItems.push(e)
                                }
                            })
                        })

                        var con = new DifferentPages(objItems)
                        constraintsArray.push(con);
                        $("#constraintTags").tagit("createTag", con.getPrintable() )

                        break;
                    case "NOT_ALL_IN_SAME_PAGE":
                        var objItems = [];

                        c.arguments.forEach(function(a) {
                            graphComponent.graph.edges.toArray().forEach(function(e) {
                                if (e.tag == a) {
                                    objItems.push(e)
                                }
                            })
                        })

                        var con = new NotAllInSamePage(objItems)
                        constraintsArray.push(con);
                        $("#constraintTags").tagit("createTag", con.getPrintable() )

                        break;
				case "EDGES_ON_PAGES":

					var objItems = [];

					c.arguments.forEach(function(a) {
						graphComponent.graph.edges.toArray().forEach(function(e) {
							if (e.tag == a) {
								objItems.push(e)
							}
						})
					})

					var con = new AssignedTo([objItems, c.modifier])
					constraintsArray.push(con);
					$("#constraintTags").tagit("createTag", con.getPrintable())

					break;
				case "NODES_REQUIRE_PARTIAL_ORDER":
					var objItems = []

					c.arguments.forEach(function(a) {
						graphComponent.graph.nodes.toArray().forEach(function(n) {
							if (n.tag == a) {
								objItems.push(n)
							}
						})
					})

					var con = new RequirePartialOrder(objItems);
					constraintsArray.push(con)
					$("#constraintTags").tagit("createTag", con.getPrintable())
					break;
				case "NODES_FORBID_PARTIAL_ORDER":
					var objItems = []

					c.arguments.forEach(function(a) {
						graphComponent.graph.nodes.toArray().forEach(function(n) {
							if (n.tag == a) {
								objItems.push(n)
							}
						})
					})

					var con = new ForbidPartialOrder(objItems);
					constraintsArray.push(con)
					$("#constraintTags").tagit("createTag", con.getPrintable())

					break;
				case "EDGES_FROM_NODES_ON_PAGES":
					var objItems = []

					c.arguments.forEach(function(a) {
						graphComponent.graph.nodes.toArray().forEach(function(n) {
							if (n.tag == a) {
								objItems.push(n)
							}
						})
					})
					var con = new RestrictEdgesFrom([objItems, c.modifier])
					constraintsArray.push(con)
					$("#constraintTags").tagit("createTag", con.getPrintable())

					break;
				case "EDGES_TO_SUB_ARC_ON_PAGES":
					var objItems = []

					c.arguments.forEach(function(a) {
						graphComponent.graph.nodes.toArray().forEach(function(n) {
							if (n.tag == a) {
								objItems.push(n)
							}
						})
					})


					var con = new RestrictEdgesToArc([objItems, c.modifier])
					constraintsArray.push(con)
					$("#constraintTags").tagit("createTag", con.getPrintable())

					break;
				}



			})
		}


		// run main method
		run()
	})
