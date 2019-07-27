var graph = {
	nodes: 11,
	edges: 27,
};

$("#button").click(function() {
	$("#button").style.border = "1px solid red";
})

$("#button").click(function() {
	var string = 	"This graph has " + graph.nodes.toString() +
					" nodes and " + graph.edges.toString() + " edges"
	alert(string)
})


