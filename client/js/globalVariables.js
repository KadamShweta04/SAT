/**
 * 
 */
var numberOfPages = 4;

let graphMLIOHandler = null;

let graph = null;


let gridInfo = null;
let grid = null;


let myGraph;
var nodecounter = 4;
var edgecounter = 4;

let constraintsArray = [];

let selEdges = [];


function filterStringByTag(string, tag) {


	var openingTag = "<" + tag + ">";
	var closingTag = "</" + tag + ">"



	var begin = []; 
	var end = [];



	var i = 0;
	while (i < string.length) {
		if ( string.substring(i, i+openingTag.length) == openingTag) {
			begin.push(i+openingTag.length);
			i = i+1;
		} else {
			i = i+1;
		}

	}

	var j = 0;
	while (j < string.length) {
		if ( string.substring(j, j+closingTag.length) == closingTag) {
			end.push(j);
			j = j+1;
		} else {
			j = j+1;
		}

	}
	var result = [];
	let k; 
	for (k = 0; k< begin.length; k++) {
		var temp = string.slice(begin[k], end[k])
		result.push(temp)

	}

	return result;
}
