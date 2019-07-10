
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
	'js/ClientSideImageExport.js',
	'js/ClientSidePdfExport.js',
	'js/next_query.js',
	'resources/license'

	], (/** @type {yfiles_namespace} */ /** typeof yfiles */ yfiles, 
			ContextMenu, 
			FileSaveSupport,
			PositionHandler,
			ShowClientSideImageExport,
			ShowClientSidePdfExport
	) => {


		/* some global variables */
		let graphComponent = []
		let graphMLIOHandler = null;

		let graph = null;


		let gridInfo = null;
		let grid = null;

		
		var standardServer = "http://sofa.fsi.uni-tuebingen.de:5555/embeddings"

		let myGraph;

		let colorsOfPages = []

		var pagesArray = [[],[],[],[]]
		var respondedObject = null;

		var constraintsArray =[]

		let clientSideImageExport = null;		
		let clientSidePdfExport = null;		

		var chosenPages = 0;


		/* Main Function */

		function request() {

			var embeddingID = location.hash
			if (embeddingID == "") {
				$("#noIDDialog").dialog("open")
			} else {
				embeddingID = embeddingID.slice(1)

				var link;  embeddingID
				
				var currentServer = window.localStorage.getItem("currentServer") 
				if (currentServer == null) {
					document.getElementById("displayCurrentServer").innerHTML("http://sofa.fsi.uni-tuebingen.de:5555/embeddings/")
					link = "http://sofa.fsi.uni-tuebingen.de:5555/embeddings/" + embeddingID
				} else {
					document.getElementById("displayCurrentServer").innerHTML = currentServer
					link = currentServer + "/embeddings/" + embeddingID
				}

				sendRequest(link)
			}
		}

		function sendRequest(link) {
			let status;
			$.ajax({
				url: link,
				success: 
					function(response) {
					status = response.status
					if (status == "FINISHED") {
						$("#loadingDiv").hide()

						if (! response.satisfiable) {
							registerCommands()
							$("#notSatisfiableNrPages").append(response.pages.length)
							$("#notSatisfiableDialog").dialog("open")
						} else {

							respondedObject = response;
							run()
						}
					}
				}, 
				error: function() {

					$("#errorDialog").dialog("open")
				},
				complete: function() {
					if (status == "IN_PROGRESS") {
						setInterval(sendRequest, 5000)
					}
				}
			})
		}

		function interpretResult(object) {
			var graph = object.graph
			graph = atob(graph)

			// LOADING IN THE GRAPH
			graphMLIOHandler
			.readFromGraphMLText(graphComponent.graph, graph)
			.then(() => {
				graphComponent.fitGraphBounds();
			})


			// LOADING THE CONSTRAINTS
			var constraints = object.constraints
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
					var objItems = [];
					c.arguments.forEach(function(a) {
						graphComponent.graph.nodes.toArray().forEach(function(n) {
							if (n.tag == a) {
								objItems.push(n)
							}
						})
					})

					var con = new RequirePartialOrder(objItems);
					constraintsArray.push(con);
					$("#constraintTags").tagit("createTag", con.getPrintable())
					break;
				case "NODES_FORBID_PARTIAL_ORDER":
					var objItems = [];
					c.arguments.forEach(function(a) {
						graphComponent.graph.nodes.toArray().forEach(function(n) {
							if (n.tag == a) {
								objItems.push(n)
							}
						})
					})

					var con = new ForbidPartialOrder(objItems);
					constraintsArray.push(con);
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

			// REARRANGING NODES 
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

					var label = e.labels.toArray()[0].text
					graphComponent.graph.addLabel(newEdge, label)
					graphComponent.graph.remove(e)
				}
			})


			// REGISTERING WHICH EDGES GO TO WHICH PAGES
			var assignments = object.assignments

			var helper = 0; 
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
			
			


			// LabelPlacing
			const edgeSegmentLabelModel = new yfiles.graph.EdgeSegmentLabelModel()

			var edgeLabels = graphComponent.graph.edgeLabels.toArray();
			edgeLabels.forEach(function(el) {
				graphComponent.graph.setLabelLayoutParameter(
						el,
						edgeSegmentLabelModel.createParameterFromCenter({
							sideOfEdge: "ABOVE_EDGE",
						})
				)
			})



			let i;
			for (i = 1; i<= chosenPages; i++) {
				changeVisibility("P"+i, true)
			}
		}

		function run() {	

			graphComponent = new yfiles.view.GraphComponent("#graphComponent");
			graphComponent.inputMode = new yfiles.input.GraphViewerInputMode({
				clickableItems:  yfiles.graph.GraphItemTypes.NODE | yfiles.graph.GraphItemTypes.EDGE,
				selectableItems: yfiles.graph.GraphItemTypes.NODE | yfiles.graph.GraphItemTypes.EDGE
			})

			showNeighborhood()

			/* zooming only when ctrl is held*/
			graphComponent.mouseWheelBehavior =
				yfiles.view.MouseWheelBehaviors.ZOOM | yfiles.view.MouseWheelBehaviors.SCROLL;  


			graphMLIOHandler = new yfiles.graphml.GraphMLIOHandler();

			const support = new yfiles.graphml.GraphMLSupport({
				graphComponent: graphComponent,
				storageLocation: yfiles.graphml.StorageLocation.FILE_SYSTEM,
				graphMLIOHandler: graphMLIOHandler
			});



			graphComponent.graph.nodeDefaults.style = new yfiles.styles.ShapeNodeStyle({
				fill: '#FFA500',
				shape: 'ellipse',
				stroke: 'white',
			})

			/*
			 * 
			 */



			chosenPages = respondedObject.pages.length

			let i;
			for (i = 1; i<= chosenPages; i++) {

				//alert("Filling")
				if (i % 2 != 0) {
					$("#display").append(
							"<div class='displayingSettings'>"+
							"<label for='displayPage"+i+"'>Page "+i+"</label><input id='displayPage"+i+"' type='checkbox' checked>"+
							"<select id='placingPage"+i+"'>"+
							"<option value='abovePage"+i+"'>above</option>"+
							"<option value='belowPage"+i+"'>below</option>"+
							"</select>"+
							"<div class='picker' id='picker"+i+"'></div>" +
							"</div>"

					)
				} else {
					$("#display").append(
							"<div class='displayingSettings'>"+
							"<label for='displayPage"+i+"'>Page "+i+"</label><input id='displayPage"+i+"' type='checkbox' checked>"+
							"<select id='placingPage"+i+"'>"+
							"<option value='abovePage"+i+"'>above</option>"+
							"<option value='belowPage"+i+"' selected='selected'>below</option>"+
							"</select>"+
							"<div class='picker' id='picker"+i+"'></div>" +
							"</div>"

					)
				}



				$("#displayPage" + i).checkboxradio()
				$("#placingPage"+ i).selectmenu({
					position: { my : "top left", at: "top center" }
				})
				$("#colorPage"+i).selectmenu({
					position: { my : "top left", at: "top center" }
				})

				$("#displayPage"+i).checkboxradio("option", "width", 150)
				$("#displayPage"+i).on("change", function(event, data) {
					var myId = this.id.slice(-1)
					if (! this.checked) {
						$("#placingPage"+ myId).selectmenu({
							disabled:true,

						})

					} else {
						$("#placingPage"+ myId).selectmenu({
							disabled:false,

						})

					}
					changeVisibility(this.id, this.checked)
				})


				$("#placingPage" + i).selectmenu("option", "width", "120px");
				$( "#placingPage" +i ).selectmenu({
					change: function( event, data ) {
						changePlacing(data.item.value)

					}
				});


				$("#picker"+i).colorPick({
					'id': i,
					'paletteLabel': 'Palette',
					'allowRecent': false,
					'initialColor' : getColor(i),
					'palette': ["#8A2BE2","#FF007F", "#FF0000", "#FF8300", "#FFFF00",  "#00FF00", "#15E2CB", "#0000FF", "#7E7E7E", "#000000"],
					'onColorSelected': function() {
						changeColor(this.id, this.color)
						this.element.css({'backgroundColor': this.color, 'color': this.color});
					}
				})
			}

			// Set the label model for edges
			graphComponent.graph.edgeDefaults.labels.layoutParameter = new yfiles.graph.SmartEdgeLabelModel({
				autoRotation: true
			}).createParameterFromSource(0, 10.0, 0.5)


			interpretResult(respondedObject)
			initializeGrid()
			registerCommands();

		}

		function getColor(i) {
			var colors = ["", "#FF0000", "#0000FF", "#00FF00", "#000000"]

			return colors[i]
		}

		function changeVisibility(id, visible) {
			var pageNr = id.slice(-1)
			var edgesToChange = pagesArray[pageNr-1]
			

			if (edgesToChange != null) {

				if (visible) {
					edgesToChange.forEach(function(edge) {
						var pageColor = colorsOfPages[pageNr-1]
						var placing = $("#placingPage" + pageNr).val()
						placing = placing.slice(0,5)

						var labels = edge.labels.toArray()
						labels.forEach(function(l) {
							graphComponent.graph.setStyle(l, unhideLabel())
						})

						graphComponent.graph.setStyle(edge, createArcStyleFromInput(getArcHeight(edge), pageColor, placing))
					})

				} else if (! visible) {
					edgesToChange.forEach(function(edge) {
						var labels = edge.labels.toArray()
						labels.forEach(function(l) {
							graphComponent.graph.setStyle(l, hideLabel())
						})
						graphComponent.graph.setStyle(edge, hideEdge())

					})	
				}
			}
		}
		function unhideLabel() {
			return new yfiles.styles.DefaultLabelStyle({
				//TODO how to place the label at the center of the arc
			})
		}

		function hideEdge() {
			return new yfiles.styles.VoidEdgeStyle()
		}

		function hideLabel() {
			return new yfiles.styles.VoidLabelStyle()
		}

		function changePlacing(placing) {
			var pageNr = parseInt(placing.slice(-1))
			var position = placing.slice(0,5)
			var edgesToChange = pagesArray[pageNr-1]

			if (edgesToChange != null) {
				var pageColor = colorsOfPages[pageNr-1]

				edgesToChange.forEach(function(edge) {
					graphComponent.graph.setStyle(edge, createArcStyleFromInput(getArcHeight(edge), pageColor, position))
				})

			}
		}

		function changeColor(id, color) {
			var edgesToChange = pagesArray[id-1]
			colorsOfPages[id-1] = color

			var visibility = $("#displayPage" + id).prop("checked")

			if (visibility) {

				if (edgesToChange.length != 0) {
					var placing = $("#placingPage" + id).val()
					placing = placing.slice(0,5)

					edgesToChange.forEach(function(edge) {
						graphComponent.graph.setStyle(edge, createArcStyleFromInput(getArcHeight(edge), color, placing))
					})
				}
			}

		}

		function createArcStyleFromInput(height, color, placing) {
			var customHeight; 
			if (placing == "above") {
				customHeight = height;
			} else {
				customHeight = -height;
			}



			var hexcolor = "2px " + color


			return new yfiles.styles.ArcEdgeStyle({
				height: customHeight,
				provideHeightHandle: false,
				fixexHeight: false,
				stroke: hexcolor,
			})
		}

		function createArcStyle(height, color) {
			return new yfiles.styles.ArcEdgeStyle({
				height: height,
				stroke: color
			})
		}



		function getArcHeight(edge) {
			const source = edge.sourceNode.layout.center
			const target = edge.targetNode.layout.center

			const distance = source.distanceTo(target)

			return Math.abs(distance/5)
		}


		function initializeExample() {
			const node1 = graphComponent.graph.createNodeAt(new yfiles.geometry.Point(0,0))
			const node2 = graphComponent.graph.createNodeAt(new yfiles.geometry.Point(200,0))
			const node3 = graphComponent.graph.createNodeAt(new yfiles.geometry.Point(400,0))
			const node4 = graphComponent.graph.createNodeAt(new yfiles.geometry.Point(600,0))

			graphComponent.graph.addLabel(node1, "1");
			graphComponent.graph.addLabel(node2, "2");
			graphComponent.graph.addLabel(node3, "3");
			graphComponent.graph.addLabel(node4, "4");

			const edge1 = graphComponent.graph.createEdge(node1, node2)
			graphComponent.graph.addLabel(edge1, "1")
			const edge2 = graphComponent.graph.createEdge(node2, node3)
			graphComponent.graph.addLabel(edge2, "2")
			const edge3 = graphComponent.graph.createEdge(node1, node3)
			graphComponent.graph.addLabel(edge3, "3")
			const edge4 = graphComponent.graph.createEdge(node2, node4)
			graphComponent.graph.addLabel(edge3, "3")


			graphComponent.fitGraphBounds();

			pagesArray = [[edge1, edge2, edge3], [edge4]]

		}

		function showNeighborhood() {
			graphComponent.inputMode.addItemClickedListener( function(sender, args)  {
				if (yfiles.graph.INode.isInstance(args.item)) {
					var node = args.item
					$("#nodeNeighborhoodDescription").empty()
					$("#nodeNeighborhood").dialog({ title: "Neighborhood of vertex " + node.toString() });

					var neighborhood = [[],[],[],[]]

					var indicentEdges = graphComponent.graph.edgesAt(node);
					indicentEdges.forEach(function(e) {
						var targetNode = e.targetNode;
						var sourceNode = e.sourceNode;

						var pageOfEdge;
						let i;
						for (i = 1; i<=4; i++) {
							if (pagesArray[i-1].includes(e)) {
								pageOfEdge = i
							}
						}


						if (targetNode != node) {
							neighborhood[pageOfEdge-1].push(targetNode)
						} else if (sourceNode != node) {
							neighborhood[pageOfEdge-1].push(sourceNode)
						}
					})


					let i;
					for (i = 1; i<=4; i++) {
						if (neighborhood[i-1].length != 0) {
							var color = colorsOfPages[i-1]
							$("#nodeNeighborhoodDescription").prepend("<br><div style='color: "+ color + "'><b>"+neighborhood[i-1].toString() + "</b></div>") 
						}
					}

				} else if (yfiles.graph.IEdge.isInstance(args.item)) {
					var edge = args.item
					$("#edgeNeighborhood").dialog({ title: "Adjacency of edge (" +edge.sourceNode + "," + edge.targetNode + ")"});

					var pageOfEdge;
					let i; 
					for ( i = 1; i <= 4; i++) {
						if (pagesArray[i-1].includes(edge)) {
							pageOfEdge = i;
						}
					}
					
					var color = colorsOfPages[pageOfEdge-1]
					$("#edgeNeighborhoodDescription").empty()
					$("#edgeNeighborhoodDescription").prepend("<div style='color: "+ color + "'><b>Source node: "+ edge.sourceNode + "<br> Target node: "+ edge.targetNode +"</b></div>")
				}
			})

		}

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
				var pages = respondedObject.pages
				pages.forEach(function(p) {
					myGraph = myGraph + "\r\n\t\t<page>"
					myGraph = myGraph + "\r\n\t\t\t<id>" + p.id + "</id>"
					myGraph = myGraph + "\r\n\t\t\t<type>" + p.type + "</type>"
					myGraph = myGraph + "\r\n\t\t\t<layout>" + p.constraint + "</layout>"
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

		function initializeGrid() {
			// Holds Info about the grid (such as spacing)
			gridInfo = new yfiles.view.GridInfo()

			gridInfo.horizontalSpacing = 40
			gridInfo.verticalSpacing = 40


			//add grid 
			grid = new yfiles.view.GridVisualCreator(gridInfo)
			grid.gridStyle = yfiles.view.GridStyle.DOTS

			graphComponent.backgroundGroup.addChild(grid)

		}


		function registerCommands(){

			/*
			 * file tab
			 */


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


			document.querySelector("#ExportButton").addEventListener("click", () => {
				$("#exportDialog").dialog("open")
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
				graphComponent.invalidate()
			})

			document.querySelector("#backButton").addEventListener("click", () => {
				$("#EditDialog").dialog("open")
			})

			document.querySelector("#editBookEmbedding").addEventListener("click", () => {
				location.href = "index.html#ll" + location.hash.slice(1)
			})


			document.querySelector("#editOriginalLayout").addEventListener("click", () => {
				location.href = "index.html#or" + location.hash.slice(1)
			})

			document.querySelector("#yesBackToEdit").addEventListener("click", () => {
				location.href = "index.html#or" + location.hash.slice(1)
			})


			/* 
			 * Export Dialog
			 */

			document.querySelector("#ExportAsPdf").addEventListener("click", () => {
				clientSidePdfExport = new ShowClientSidePdfExport()

				const scale = parseFloat(1)
				const margin = parseFloat(5)

				clientSidePdfExport.scale = scale
				clientSidePdfExport.margins = new yfiles.geometry.Insets(margin)

				clientSidePdfExport.exportPdf(graphComponent.graph, null). then(pdfUrl => {
					pdfUrl = pdfUrl
					FileSaveSupport.save(pdfUrl, 'graph.pdf')
				}).catch(() => {
					alert(
							'Saving directly to the filesystem is not supported by this browser. Make sure to save your graph as .graphml and try with another browser'
					)
				})

				$("#exportDialog").dialog("close");

			})

			document.querySelector("#ExportAsImage").addEventListener("click", () => {
				const scale = parseFloat(1)
				const margin = parseFloat(5)

				clientSideImageExport = new ShowClientSideImageExport();

				clientSideImageExport.scale = scale
				clientSideImageExport.margins = new yfiles.geometry.Insets(margin)

				clientSideImageExport
				.exportImage(graphComponent.graph, null)
				.then(pngImage => {
					FileSaveSupport.save(pngImage.src, 'graph.png')
				}).catch(() => {
					alert(
							'Saving directly to the filesystem is not supported by this browser. Make sure to save your graph as .graphml and try with another browser'
					)
				})

				$("#exportDialog").dialog("close");
			})

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
				if (cyclePath.length == 0) {
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

		request()



	})



