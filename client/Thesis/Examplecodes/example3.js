var graph = {
	nodes: 11,
	edges: 27,
};

document.getElementById("button").addEventListener("mouseover", function() {
	document.getElementById("button").style.border = "1px solid red";
})

document.getElementById("button").addEventListener("click", function() {
	var string = 	"This graph has " + graph.nodes.toString() +
					" nodes and " + graph.edges.toString() + " edges"
	alert(string)
})


