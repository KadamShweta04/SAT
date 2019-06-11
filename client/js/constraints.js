/**
 * Class Constraints
 * 
 * Attributes: 
 * Type
 * Objects
 * Printable
 * 
 */

class Constraint {

	constructor (_type, _objects) {

		this.type = _type;
		this.objects = _objects;
		this.printable = "error"


	}

	getPrintable() {
		return this.printable;
	}

	getObjects() {
		return this.objects;
	}

	getType() {
		return this.type;
	}

	serialize() {
		var tags = [];

		this.objects.forEach(function(o) {
			tags.push(o.tag)
		})

		return "\t\t<constraint>\r\n\t\t\t<type>" + this.type + "</type>\r\n\t\t\t<objects>" + tags.toString() + "</objects>\r\n\t\t</constraint>"
	}


}

class Predecessor extends Constraint {
	constructor(_objects) {
		super("NODES_PREDECESSOR",_objects)

		this.printable = "predecessor(" + this.objects.toString() + ")"
	}

	updatePrintable() {
		this.printable = "predecessor(" + this.objects.toString() + ")"
	}

}

class Consecutive extends Constraint {
	constructor(_objects) {
		super("NODES_CONSECUTIVE",_objects)

		this.printable = "consecutive(" + this.objects.toString() + ")"
	}

	updatePrintable() {
		this.printable = "consecutive(" + this.objects.toString() + ")"
	}

}



class SamePage extends Constraint {
	constructor(_objects) {
		super("EDGES_SAME_PAGES",_objects)

		this.printable = "samePage(" + this.objects.toString() + ")"
	}




	updatePrintable() {
		this.printable = "samePage(" + this.objects.toString() + ")"
	}

}

class DifferentPages extends Constraint {
	constructor(_objects) {
		super("EDGES_DIFFERENT_PAGES",_objects)

		this.printable ="differentPages(" + this.objects.toString() + ")"
	}



	updatePrintable() {
		this.printable = "differentPages(" + this.objects.toString() + ")"
	}
}

class AssignedTo extends Constraint {
	constructor(_objects) {
		super("EDGES_ON_PAGES",_objects)

		this.printable = "assignedTo(" + this.objects[0].toString()  + " | " + this.objects[1].toString() + ")"
	}



	serialize() {
		var edges = this.objects[0];

		var tags = []

		edges.forEach(function(e) {
			tags.push(e.tag)
		})

		return "\t\t<constraint>\r\n\t\t\t<type>" + this.type + "</type>\r\n\t\t\t<objects>\r\n\t\t\t\t<objectsA>"+ tags.toString()+"</objectsA>\r\n\t\t\t\t<objectsB>" + this.objects[1]+ "</objectsB>\r\n\t\t\t</objects>\r\n\t\t</constraint>"
	}

	updatePrintable() {
		this.printable = "assignedTo(" + this.objects[0].toString()  + " | " + this.objects[1].toString() + ")"
	}
}

class AbsoluteOrder extends Constraint {
	constructor(_objects) {
		super("NODES_ABSOLUTE_ORDER", _objects)

		this.printable = "requireOrder(" + this.objects.toString() + ")"

	}

	updatePrintable() {
		this.printable = "requireOrder(" + this.objects.toString() + ")"
	}

}

class RequirePartialOrder extends Constraint {
	constructor(_objects) {
		super("NODES_REQUIRE_PARTIAL_ORDER", _objects)

		this.printable = "requirePartialOrder(" + this.objects.toString() + ")" 
	}

	updatePrintable() {
		this.printable = "requirePartialOrder(" + this.objects.toString() + ")" 

	}
}


class ForbidPartialOrder extends Constraint {
	constructor(_objects) {
		super("NODES_FORBID_PARTIAL_ORDER", _objects)

		this.printable = "forbidPartialOrder(" + this.objects.toString() + ")"

	}

	updatePrintable() {
		this.printable = "forbidPartialOrder(" + this.objects.toString() + ")"
	}

}

class RestrictEdgesFrom extends Constraint {
	constructor(_objects) {
		super("EDGES_FROM_NODES_ON_PAGES", _objects)

		this.printable = "restrictEdgesFrom(" + this.objects[0].toString() + " | " + this.objects[1].toString() + ")"
	}
	
	updatePrintable() {
		this.printable = "restrictEdgesFrom(" + this.objects[0].toString() + " | " + this.objects[1].toString() + ")"
	}
	
	serialize() {
		var edges = this.objects[0];

		var tags = []

		edges.forEach(function(e) {
			tags.push(e.tag)
		})

		return "\t\t<constraint>\r\n\t\t\t<type>" + this.type + "</type>\r\n\t\t\t<objects>\r\n\t\t\t\t<objectsA>"+ tags.toString()+"</objectsA>\r\n\t\t\t\t<objectsB>" + this.objects[1]+ "</objectsB>\r\n\t\t\t</objects>\r\n\t\t</constraint>"
	}
}

class RestrictEdgesToArc extends Constraint {
	constructor(_objects) {
		super("EDGES_TO_SUB_ARC_ON_PAGES", _objects)

		this.printable = "restrictEdgesToArc(" + this.objects[0].toString() + " | " + this.objects[1].toString() + ")"
	}
	
	updatePrintable() {
		this.printable = "restrictEdgesToArc(" + this.objects[0].toString() + " | " + this.objects[1].toString() + ")"
	}
	
	serialize() {
		var edges = this.objects[0];

		var tags = []

		edges.forEach(function(e) {
			tags.push(e.tag)
		})

		return "\t\t<constraint>\r\n\t\t\t<type>" + this.type + "</type>\r\n\t\t\t<objects>\r\n\t\t\t\t<objectsA>"+ tags.toString()+"</objectsA>\r\n\t\t\t\t<objectsB>" + this.objects[1]+ "</objectsB>\r\n\t\t\t</objects>\r\n\t\t</constraint>"
	}
}


