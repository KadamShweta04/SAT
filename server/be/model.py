from typing import List

import numpy as np
from flask_restplus import abort
from numpy import ndarray

from be.custom_types import Edge, PageAssignment
from be.utils import get_duplicates


def static_node_order_generation(node_order: ndarray) -> List[List[int]]:
    """
    Generates the clauses to ensure that the node order is asymmetric and transitive. It is static in order to make
    optimizing more easy

    :param node_order: all node order variables
    :return: the list of generated clauses
    """
    clauses = []
    # Ensure asymmetry
    for i in range(node_order.shape[0]):
        for j in range(i):
            if i == j:
                continue
            # i before j XOR j before i
            clauses.append([node_order[i, j], node_order[j, i]])
            clauses.append([-node_order[i, j], -node_order[j, i]])

            # ensure transitivity
            for k in range(node_order.shape[0]):
                if i == j or j == k or k == i:
                    continue
                # (i_before_j & j_before_k) >> i_before_k   simplified => i_before_k | ~i_before_j | ~j_before_k
                clauses.append([node_order[i, k], -node_order[i, j], -node_order[j, k]])

    return clauses


def static_assignments_vars(variables: ndarray) -> List[List[int]]:
    """
    Generates the clauses to assign each edge to at least one page

    :param variables:
        """
    clauses = []
    for i in range(variables.shape[1]):
        # each page has to be assigned to at least one page
        clauses.append(list(variables[:, i]))
        # i_on_page_j >> -i_on_page_k
        # at most one page per edge
        for j in range(variables.shape[0]):
            for k in range(j + 1, variables.shape[0]):
                clauses.append([-variables[j, i], -variables[k, i]])
    return clauses


def static_get_order_clauses(node_order, *args: List[int]) -> List[List[int]]:
    """
    This helper method generates clauses to ensure the given relative node order is met.

    :param node_order: All node order variables
    :param args: The relative node order to meet.
    :return: the generated clauses.
    """
    arg_len = len(args)
    assert 2 <= arg_len < 5, "Must pass at least two and at most four arguments"
    orders = [
        node_order[args[0], args[1]],
        node_order[args[1], args[2]],
    ]
    if arg_len == 4:
        orders.append(node_order[args[2], args[3]])
    return orders


def static_to_dimacs(clauses: list, first_line: str) -> str:
    """
    This method generates a string in the `DIMACS <http://www.satcompetition.org/2009/format-benchmarks2009.html>`_ format.
    This method is on of the hotspots for large problem instances. It was compared against various other
    implementations. The exact test done are provided in the full documentations and as
    source code comments below this method.

    :param clauses: the clauses to encode
    :param first_line: the header of the generated file
    :return: a string which encodes all given clauses in DIMACS format
    """
    ret_val = first_line
    # Code block 'str translate' took: 26281.30907699233 ms
    s = str(clauses)[2:-2].translate(
        str.maketrans({'\n': None, ' ': None, ',': " "})
    ).replace(
        "] [", " 0\n"
    ) + " 0"
    ret_val += s
    return ret_val
    # Now following are the compared algorithms

    # Code block 'join' took: 47857.816228002775 ms
    # Also does this need a huge amount of RAM
    # lines = [' '.join(map(str, c)) + " 0" for c in clauses]
    # s1 = "\n".join(lines)

    # Code block 'str replace' took: 31469.545044004917 ms
    # s = str(clauses).replace(
    #     "\n", "").replace(
    #     " ", "").replace(
    #     "[[", "").replace(
    #     "]]", " 0").replace(
    #     "],[", " 0\n").replace(
    #     ",", " ")


def static_encode_same_page(e1_idx: int, e2_idx: int, assignment_variables: ndarray) -> List[List[int]]:
    """
    This method generates the clauses to encode that two edges are on the same page. Because the corresponding CNF
    gets bloated on many pages, this method only handles page number up to including 4.

    :param e1_idx: the index of the first edge
    :param e2_idx:  the index of the second edge
    :param assignment_variables: all edge to page assignment variables
    :return: the generated clauses
    """
    # to generate the clauses to add
    # print(str(sympy.to_cnf((e1_p1 & e2_p1) | (e1_p2 & e2_p2) | **...** ))
    # .translate(str.maketrans({'&': '\n', ' ': None, '~': "-", "|":",","(":'[',')':']'})))
    clauses = []
    page_number = assignment_variables.shape[0]
    if page_number == 1:
        pass
    elif page_number == 2:
        e1_p1 = assignment_variables[0, e1_idx]
        e2_p1 = assignment_variables[0, e2_idx]
        e1_p2 = assignment_variables[1, e1_idx]
        e2_p2 = assignment_variables[1, e2_idx]
        clauses.append([e1_p1, e1_p2])
        clauses.append([e1_p1, e2_p2])
        clauses.append([e1_p2, e2_p1])
        clauses.append([e2_p1, e2_p2])
    elif page_number == 3:
        e1_p1 = assignment_variables[0, e1_idx]
        e2_p1 = assignment_variables[0, e2_idx]
        e1_p2 = assignment_variables[1, e1_idx]
        e2_p2 = assignment_variables[1, e2_idx]
        e1_p3 = assignment_variables[2, e1_idx]
        e2_p3 = assignment_variables[2, e2_idx]

        clauses.append([e1_p1, e1_p2, e1_p3])
        clauses.append([e1_p1, e1_p2, e2_p3])
        clauses.append([e1_p1, e1_p3, e2_p2])
        clauses.append([e1_p1, e2_p2, e2_p3])
        clauses.append([e1_p2, e1_p3, e2_p1])
        clauses.append([e1_p2, e2_p1, e2_p3])
        clauses.append([e1_p3, e2_p1, e2_p2])
        clauses.append([e2_p1, e2_p2, e2_p3])
    elif page_number == 4:
        e1_p1 = assignment_variables[0, e1_idx]
        e2_p1 = assignment_variables[0, e2_idx]
        e1_p2 = assignment_variables[1, e1_idx]
        e2_p2 = assignment_variables[1, e2_idx]
        e1_p3 = assignment_variables[2, e1_idx]
        e2_p3 = assignment_variables[2, e2_idx]
        e1_p4 = assignment_variables[3, e1_idx]
        e2_p4 = assignment_variables[3, e2_idx]

        clauses.append([e1_p1, e1_p2, e1_p3, e1_p4])
        clauses.append([e1_p1, e1_p2, e1_p3, e2_p4])
        clauses.append([e1_p1, e1_p2, e1_p4, e2_p3])
        clauses.append([e1_p1, e1_p2, e2_p3, e2_p4])
        clauses.append([e1_p1, e1_p3, e1_p4, e2_p2])
        clauses.append([e1_p1, e1_p3, e2_p2, e2_p4])
        clauses.append([e1_p1, e1_p4, e2_p2, e2_p3])
        clauses.append([e1_p1, e2_p2, e2_p3, e2_p4])
        clauses.append([e1_p2, e1_p3, e1_p4, e2_p1])
        clauses.append([e1_p2, e1_p3, e2_p1, e2_p4])
        clauses.append([e1_p2, e1_p4, e2_p1, e2_p3])
        clauses.append([e1_p2, e2_p1, e2_p3, e2_p4])
        clauses.append([e1_p3, e1_p4, e2_p1, e2_p2])
        clauses.append([e1_p3, e2_p1, e2_p2, e2_p4])
        clauses.append([e1_p4, e2_p1, e2_p2, e2_p3])
        clauses.append([e2_p1, e2_p2, e2_p3, e2_p4])
    else:
        abort(501, "The constraint EDGES_SAME_PAGES for {} pages it is not implemented".format(page_number))
    return clauses


def static_encode_different_pages(e1_idx, e2_idx, assignment_variables) -> List[List[int]]:
    """
    Encodes different pages for two edges.

    :param e1_idx: the first edge id
    :param e2_idx: the second edge id
    :param assignment_variables: all edge to page assignment variables
    :return: the generated clauses
    """
    clauses = []
    page_number = assignment_variables.shape[0]

    if page_number == 1:
        abort(400, "It is not possible to encode different pages if there is only one page")

    for p in range(page_number):
        clauses.append([-assignment_variables[p, e1_idx], -assignment_variables[p, e2_idx]])

    return clauses


def static_encode_node_absolute_order(node_order, n1, n2) -> List[List[int]]:
    """
    Encodes that two nodes are direct adjacent to each other with n1 being the first. In contrast
    to :func:`~be.model.static_encode_nodes_as_neighbors` which does not require the intrinsic order.

    :param node_order: all node order variables
    :param n1: the first node
    :param n2: the second node
    :return: the generated clauses
    """
    clauses = []
    for i in range(node_order.shape[0]):
        if i == n1 or i == n2:
            continue
        clauses.append([node_order[n1, n2]])
        clauses.append([node_order[i, n1], node_order[n2, i]])
    return clauses


def static_encode_nodes_as_neighbors(node_order, n1, n2) -> List[List[int]]:
    """
    Encodes that two nodes are next to each other without requiring a particular order. In contrast
    to :func:`~be.model.static_encode_node_absolute_order` which requires the intrinsic order as well.

    :param node_order:
    :param n1:
    :param n2:
        """
    clauses = []
    for i in range(node_order.shape[0]):
        if i == n1 or i == n2:
            continue
        clauses.append([-node_order[n1, n2], node_order[i, n1], node_order[n2, i]])
        clauses.append([node_order[n1, n2], -node_order[i, n1], -node_order[n2, i]])
    return clauses

def static_encode_nodes_set_first(node_order, n1) -> List[List[int]]:
    """
    Encodes that the given node is frst.

    :param node_order:
    :param n1:
        """
    clauses = []
    for i in range(node_order.shape[0]):
        if i == n1:
            continue
        clauses.append([node_order[n1, i]])
    return clauses


def static_encode_page_constraint_stack(assignment_variables: ndarray, edges: ndarray, node_order: ndarray,
                                        page_idx: int) -> List[List[int]]:
    """
    Encodes the page type stack

    :param assignment_variables: all edge to page assignments
    :param edges: all edges
    :param node_order: all node order variables
    :param page_idx: the index of the current page
            """
    clauses = []
    for i in range(edges.shape[0]):
        e1 = edges[i]
        e1_idx = e1[0]
        e1n1 = e1[1]
        e1n2 = e1[2]
        e1_page_var = assignment_variables[page_idx, e1_idx]
        for j in range(i):
            e2 = edges[j]
            if e1[0] == e2[0]:
                continue
            e2_idx = e2[0]
            e2_page_var = assignment_variables[page_idx, e2_idx]
            e2n1 = e2[1]
            e2n2 = e2[2]

            duplicates = get_duplicates([e1[1], e1[2], e2[1], e2[2]])

            if len(duplicates) > 1:
                # ignore double edges
                continue
                # abort(400,
                #       "Got more than one shared nodes. Multi edges are not allowed. "
                #       "The duplicated nodes where {}".format(duplicates))
            # if the edges share one node
            elif len(duplicates) == 1:
                # adjacent edges do not need handling
                continue
            else:

                # forbid alternating patterns of node from e1 and e2
                order_clauses = np.array([
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e1n1, e2n1, e1n2, e2n2),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e1n1, e2n2, e1n2, e2n1),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e1n2, e2n1, e1n1, e2n2),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e1n2, e2n2, e1n1, e2n1),

                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e2n1, e1n1, e2n2, e1n2),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e2n1, e1n2, e2n2, e1n1),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e2n2, e1n1, e2n1, e1n2),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e2n2, e1n2, e2n1, e1n1),
                ])
                clauses.extend((order_clauses * -1).tolist())

    return clauses


def static_encode_page_constraint_queue(assignment_variables: ndarray, edges: ndarray, node_order: ndarray,
                                        page_idx: int) -> List[List[int]]:
    """
           Encodes the page type queue

           :param assignment_variables: all edge to page assignments
           :param edges: all edges
           :param node_order: all node order variables
           :param page_idx: the index of the current page
                          """
    clauses = []
    for i in range(edges.shape[0]):
        e1 = edges[i]
        e1_idx = e1[0]
        e1n1 = e1[1]
        e1n2 = e1[2]
        e1_page_var = assignment_variables[page_idx, e1_idx]
        for j in range(i):
            e2 = edges[j]
            if e1[0] == e2[0]:
                continue
            e2_idx = e2[0]
            e2_page_var = assignment_variables[page_idx, e2_idx]
            e2n1 = e2[1]
            e2n2 = e2[2]

            duplicates = get_duplicates([e1[1], e1[2], e2[1], e2[2]])

            if len(duplicates) > 1:

                # ignore double edges
                continue
                # abort(400,
                #       "Got more than one shared nodes. Multi edges are not allowed. "
                #       "The duplicated nodes where {}".format(duplicates))
            # if the edges share one node
            elif len(duplicates) == 1:
                # adjacent edges do not need handling
                continue
            else:

                # forbid enclosing patterns
                order_clauses = np.array([
                    # e1 encloses e2
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e1n1, e2n1, e2n2, e1n2),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e1n1, e2n2, e2n1, e1n2),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e1n2, e2n1, e2n2, e1n1),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e1n2, e2n2, e2n1, e1n1),

                    # e2 encloses e1
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e2n1, e1n1, e1n2, e2n2),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e2n1, e1n2, e1n1, e2n2),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e2n2, e1n1, e1n2, e2n1),
                    [e1_page_var, e2_page_var] + static_get_order_clauses(node_order, e2n2, e1n2, e1n1, e2n1),
                ])
                clauses.extend((order_clauses * -1).tolist())
    return clauses


class SatModel(object):
    """
    This class is responsible for generating the clauses corresponding to the given Problem instance.
    """

    def __init__(self, pages, edges: Edge, node_ids: List[int], constraints):
        """
        Initializes the model with the given params. Also does some basic validation.

        :param pages: the pages
        :param edges: the edges
        :param node_ids: the node id
        :param constraints: the constraints
        """

        self.result = {}
        self.node_ids = node_ids
        self.edges = edges
        self.pages = pages
        self.constraints = constraints
        self.clauses = []

        node_id_dupes = get_duplicates(node_ids)
        if len(node_id_dupes) > 0:
            abort(400, "Node ids have to be unique. The id(s) {} occurred multiple times".format(node_id_dupes))
        edge_id_dupes_dupes = get_duplicates([e.id for e in edges])
        if len(edge_id_dupes_dupes) > 0:
            abort(400, "Edge ids have to be unique. The id(s) {} occurred multiple times".format(edge_id_dupes_dupes))
        page_id_dupes_dupes = get_duplicates([p['id'] for p in pages])
        if len(page_id_dupes_dupes) > 0:
            abort(400, "Page ids have to be unique. The id(s) {} occurred multiple times".format(page_id_dupes_dupes))

        node_id_size = len(node_ids)
        self._node_idxs = list(range(node_id_size))
        self._node_idx_to_id = {i: n_id for i, n_id in enumerate(node_ids)}
        self._node_id_to_idx = {n_id: i for i, n_id in enumerate(node_ids)}

        pages_len = len(pages)
        self._page_idxs = list(range(pages_len))
        self.page_idx_to_id = {i: p['id'] for i, p in enumerate(pages)}
        self.page_id_to_idx = {p['id']: i for i, p in enumerate(pages)}

        edges_len = len(edges)
        self._edge_idxs = list(range(edges_len))
        self.edge_idx_to_id = {i: e.id for i, e in enumerate(edges)}
        self.edge_id_to_idx = {e.id: i for i, e in enumerate(edges)}

        # enumerates all constraints from one on. zero is excluded because its delimiter meaning in dimacs format
        self.max_var = 0

        # self._node_order[i,j] means i is before j
        self._node_order = self._create_new_vars(node_id_size * node_id_size).reshape((node_id_size, node_id_size))

        self._assignment_variables = self._create_new_vars(pages_len * edges_len).reshape((pages_len, edges_len))

    def _create_new_vars(self, number: int = 1) -> ndarray:
        assert number >= 1, "cannot create less than 1 new variables"
        new_vars = np.arange(self.max_var + 1, self.max_var + 1 + number)
        self.max_var = np.max(new_vars)
        return new_vars

    def add_relative_node_order_clauses(self):
        """
        Ensures that asymmetry and transitivity are encoded.

        """
        node_order = self._node_order

        clauses = static_node_order_generation(node_order)
        self._add_clauses(clauses)

    def add_page_assignment_clauses(self):
        """
        Ensures that each edge is on at least one page.

        """
        variables = self._assignment_variables
        clauses = static_assignments_vars(variables)
        self._add_clauses(clauses)

    def get_vertex_order_result(self) -> List[str]:
        """
        Reads the result and translates it back into a the computed order of vertexes.

        :return: the order of the vertexes
        """
        if not self.result or not np.size(self.result['node_order']) > 0:
            raise Exception("Please set the result first")
        ordered = np.argsort(self.result['node_order'].sum(axis=1))[::-1]

        ret_val = []
        for v in ordered:
            ret_val.append(self._node_idx_to_id[v])
        assert len(ret_val) == len(
            self.node_ids), "Not all nodes from >{}< are present in the ordered dict >{}<".format(self.node_ids,
                                                                                                  ordered)
        return ret_val

    def get_page_assignments_result(self) -> List[PageAssignment]:
        """
        Reads the result and translates it back to edge to page assignments.

        :return: The list of page assignments
        """

        if not self.result or not np.size(self.result['page_assignment']):
            raise Exception("Please set the result first")

        # get the indexes of the page assignment variables which evaluated to True
        as_idxs = np.argwhere(self.result['page_assignment'])

        # Create a PageAssignment for each True variable and translate the index beck to the given id
        ret_val = []
        for idx in as_idxs:
            edge_id = self.edge_idx_to_id[idx[1]]
            page_id = self.page_idx_to_id[idx[0]]
            ret_val.append(PageAssignment(edge=edge_id, page=page_id))
        return ret_val

    def add_page_constraints(self):
        """
        Generates the clauses to encode the page type as well as additional page constraints like DISPERSIBLE or TREE.
        """
        edges = np.array([
            [self.edge_id_to_idx[e.id],
             self._node_id_to_idx[e.source],
             self._node_id_to_idx[e.target]] for
            e in self.edges])
        assignment_variables = self._assignment_variables
        node_order = self._node_order
        for page in self.pages:
            page_idx = self.page_id_to_idx[page['id']]
            page_constraint = page.get('constraint', "NONE")
            page_constraint_clauses = self._add_additional_page_constraint(assignment_variables, edges, page_constraint,
                                                                           page_idx)
            self._add_clauses(page_constraint_clauses)
            page_type = page['type']
            if page_type == 'STACK':
                clauses = static_encode_page_constraint_stack(assignment_variables, edges, node_order, page_idx)
                self._add_clauses(clauses)

            elif page_type == 'QUEUE':
                clauses = static_encode_page_constraint_queue(assignment_variables, edges, node_order, page_idx)
                self._add_clauses(clauses)
            elif page_type == 'NONE':
                continue
            else:
                abort(501, "Page type {} is currently not implemented".format(page_type))

    def add_additional_constraints(self):
        """
        Adds the clauses to encode the given additional constraints.
        """

        if not self.constraints:
            return
        for con in self.constraints:
            clauses = []
            con_args = con['arguments']
            con_modifier = con.get('modifier')
            if con['type'] == 'EDGES_ON_PAGES':
                if not con_modifier:
                    abort(400, "EDGES_ON_PAGES constraints need the modifier set")
                for e_id in con_args:
                    sympy_clause = []
                    e_idx = self.edge_id_to_idx[e_id]
                    for p_id in con['modifier']:
                        p_idx = self.page_id_to_idx[p_id]
                        sympy_clause.append(self._assignment_variables[p_idx, e_idx])
                    clauses.append(sympy_clause)
            elif con['type'] == 'EDGES_SAME_PAGES':
                e_idxs = [self.edge_id_to_idx[e_id] for e_id in con_args]

                for i in range(len(e_idxs)):
                    if i == 0:
                        continue
                    clauses.extend(static_encode_same_page(e_idxs[i - 1], e_idxs[i],
                                                           self._assignment_variables))
            elif con['type'] == 'EDGES_DIFFERENT_PAGES':

                if len(self.pages) < len(con_args):
                    abort(400, "It is not possible to fit {} edges on {} different pages.".format(len(con_args),
                                                                                                   len(self.pages)))

                for i, ignore1 in enumerate(con_args):
                    for j in range(i):
                        if i == j:
                            continue
                        clauses.extend(static_encode_different_pages(self.edge_id_to_idx[con_args[i]],
                                                                     self.edge_id_to_idx[con_args[j]],
                                                                     self._assignment_variables))
            elif con['type'] == 'NOT_ALL_IN_SAME_PAGE':

                if len(self.pages) < 2:
                    abort(400, "There is only one available page.")

                for i in enumerate(con_args): 
                    clause = []
                    for p in range(page_number):
                        clause.append(-assignment_variables[p, self.edge_id_to_idx[con_args[i]]])
                    clauses.append(clause)
                     
                     
            elif con['type'] == 'EDGES_TO_SUB_ARC_ON_PAGES':
                if len(con_args) != 2:
                    abort(400, "The EDGES_TO_SUB_ARC_ON_PAGES constraint only allows exactly two arguments")

                if not con_modifier or not len(con_modifier) >= 1:
                    abort(400, "The EDGES_TO_SUB_ARC_ON_PAGES constraint requires at least one modifiers.")
                s_idx = self._node_id_to_idx[con_args[0]]
                t_idx = self._node_id_to_idx[con_args[1]]
                clauses = []
                for e in self.edges:
                    node_set = {e.target, e.source, con_args[0], con_args[1]}
                    if len(node_set) == 3:
                        nodes = node_set
                        nodes.remove(con_args[0])
                        nodes.remove(con_args[1])
                        v = list(nodes)[0]
                        v_idx = self._node_id_to_idx[v]
                        e_idx = self.edge_id_to_idx[e.id]
                        clause = [-self._node_order[s_idx, v_idx],
                                  -self._node_order[v_idx, t_idx]]

                        for p in con_modifier:
                            p_idx = self.page_id_to_idx[p]
                            clause.append(self._assignment_variables[p_idx, e_idx])

                        clauses.append(clause)
                    else:
                        continue

            elif con['type'] == 'EDGES_FROM_NODES_ON_PAGES':
                if not len(con_args) >= 1:
                    abort(400, "The EDGES_FROM_NODES_ON_PAGES constraint requires at least on vertex")

                if not con_modifier or not len(con_modifier) >= 1:
                    abort(400, "The EDGES_FROM_NODES_ON_PAGES constraint requires at least on page")
                p_idxs = [self.page_id_to_idx[p_id] for p_id in con_modifier]
                clauses = []
                for e in self.edges:
                    if e.target in con_args or e.source in con_args:
                        clause = []
                        e_idx = self.edge_id_to_idx[e.id]
                        for p_idx in p_idxs:
                            clause.append(self._assignment_variables[p_idx, e_idx])
                        clauses.append(clause)
                    else:
                        continue

            elif con['type'] == 'NODES_PREDECESSOR':
                if not con_modifier:
                    abort(400, "NODES_PREDECESSOR constraints need the modifier set")
                for first in con_args:
                    for second in con['modifier']:
                        if first == second:
                            abort(400,
                                  "The key '{}' is in arguments and modifier which is not allowed".format(first))
                        clauses.append([self._node_order[self._node_id_to_idx[first], self._node_id_to_idx[second]]])
            elif con['type'] == 'NODES_ABSOLUTE_ORDER' or con['type'] == 'NODES_REQUIRE_ABSOLUTE_ORDER':
                for i in range(len(con_args)):
                    if i == 0:
                        continue
                    clauses.extend(static_encode_node_absolute_order(self._node_order,
                                                                     self._node_id_to_idx[con_args[i - 1]],
                                                                     self._node_id_to_idx[con_args[i]]))
            elif con['type'] == 'NODES_FORBID_PARTIAL_ORDER':
                clause = []
                for i in range(len(con_args)):
                    if i == 0:
                        continue
                    clause.append(-self._node_order[self._node_id_to_idx[con_args[i - 1]],
                                                    self._node_id_to_idx[con_args[i]]])
                clauses.append(clause)
            elif con['type'] == 'NODES_REQUIRE_PARTIAL_ORDER':
                for i in range(len(con_args)):
                    if i == 0:
                        continue
                    clauses.append([self._node_order[self._node_id_to_idx[con_args[i - 1]],
                                                     self._node_id_to_idx[con_args[i]]]])
            elif con['type'] == 'NODES_CONSECUTIVE':
                if len(con_args) != 2:
                    abort(400, "The NODES_CONSECUTIVE constraint only allows exactly two arguments")
                clauses.extend(static_encode_nodes_as_neighbors(self._node_order,
                                                                self._node_id_to_idx[con_args[0]],
                                                                self._node_id_to_idx[con_args[1]]))
            elif con['type'] == 'NODES_SET_FIRST':
                if len(con_args) != 1:
                    abort(400, "The NODES_SET_FIRST constraint only allows exactly one argument")
                
                clauses.extend(static_encode_nodes_set_first(self._node_order,
                                                            self._node_id_to_idx[con_args[0]]))

            else:
                raise abort(500, "The given constraint {} is not implemented yet".format(con['type']))
            self._add_clauses(clauses)
        pass

    def _add_clauses(self, clauses):
        self.clauses.extend(clauses)

    def to_dimacs_str(self):
        """
        generates a string in `DIMACS <http://www.satcompetition.org/2009/format-benchmarks2009.html>`_ format
        encoding all the clauses. Out to conserve memory, the clauses will be deleted after the string generation.
        """
        clauses = self.clauses
        first_line = "p cnf {} {}\n".format(np.max(self.max_var), len(clauses))
        res_str = static_to_dimacs(clauses, first_line)
        # remove the references in order to free memory
        self.clauses = None
        return res_str

    def parse_lingeling_result(self, dimacs_string):
        """
        Takes the result string from lingeling and parses it back into the model.

        :param dimacs_string: the result string from lingeling

        """
        result = {}

        lines = dimacs_string.split('\n')
        important_lines = [l for l in lines if not l.startswith('c') and l]
        comment_lines = [l for l in lines if l.startswith('c') and l]
        result['full'] = "\n".join(comment_lines)

        s_marker = [str(l).rsplit(' ') for l in important_lines if l.startswith('s')][0][1:]

        if s_marker[0] == "SATISFIABLE":
            result['satisfiable'] = True
            v_markers = []
            for l in important_lines:
                if l.startswith('v'):
                    splits = str(l).rsplit(' ')
                    splits_without_leading_v = splits[1:]
                    v_markers.extend(splits_without_leading_v)
            if "0" in v_markers:
                v_markers.remove("0")
            assert len(v_markers) == self.max_var, "Could not parse the expected number of variables from the " \
                                                   "lingeling result. Expected {} got {}".format(self.max_var,
                                                                                                 len(v_markers))
            vars = np.array(list(map(int, v_markers)))
            sorted_idx = np.argsort(np.abs(vars))
            vars = vars[sorted_idx]

            # in the result format the positive variable number is used to indicate True and the negative for false
            # the > 0 evaluates to true for all true variables in the result.
            result['node_order'] = vars[
                                   :np.size(self._node_order)].reshape(self._node_order.shape) > 0
            result['page_assignment'] = vars[
                                        np.size(self._node_order):np.size(self._node_order) + np.size(
                                            self._assignment_variables)].reshape(
                self._assignment_variables.shape) > 0
            pass

        else:
            result['satisfiable'] = False

        self.result = result

        return result

    def _add_additional_page_constraint(self, assignment_variables: ndarray, edges: ndarray, page_constraint: str,
                                        page_idx: int):
        """
        This method generates the clauses to encode additional page constraints like dispensable or tree.

        :param assignment_variables: all edge to page variables
        :param edges: all edges
        :param page_constraint: the constraint for this page
        :param page_idx: the index of the current page
        :return: the generated clauses
        """

        clauses = []
        if page_constraint == 'NONE' or page_constraint is None:
            pass
        elif page_constraint == 'DISPERSIBLE':
            for i in range(edges.shape[0]):
                e1 = edges[i]
                e1_idx = e1[0]
                e1n1 = e1[1]
                e1n2 = e1[2]
                e1_page_var = assignment_variables[page_idx, e1_idx]
                for j in range(i):
                    e2 = edges[j]
                    if e1[0] == e2[0]:
                        continue
                    e2_idx = e2[0]
                    e2_page_var = assignment_variables[page_idx, e2_idx]
                    e2n1 = e2[1]
                    e2n2 = e2[2]

                    duplicates = get_duplicates([e1n1, e1n2, e2n1, e2n2])
                    len_duplicates = len(duplicates)
                    if len_duplicates == 1:
                        clauses.append([-e1_page_var, -e2_page_var])
                    if len_duplicates > 1:
                        continue
                    else:
                        continue
        elif page_constraint == 'FOREST':
            node_len = len(self.node_ids)
            parents = self._create_new_vars(node_len ** 2).reshape((node_len, node_len))
            ancestors = self._create_new_vars(node_len ** 2).reshape((node_len, node_len))
            self._add_forrest_constraints(ancestors, assignment_variables, clauses, edges, page_idx, parents)

        elif page_constraint == 'TREE':
            node_len = len(self.node_ids)
            parents = self._create_new_vars(node_len ** 2).reshape((node_len, node_len))
            ancestors = self._create_new_vars(node_len ** 2).reshape((node_len, node_len))
            is_root = self._create_new_vars(node_len).reshape((node_len,))
            self._add_forrest_constraints(ancestors, assignment_variables, clauses, edges, page_idx, parents)

            for i in range(parents.shape[0]):
                parents_of_i: List[int] = list(parents[:, i])
                parents_of_i.remove(parents[i, i])
                # if there is a parent to i, it is not root
                for parent in parents_of_i:
                    clauses.append([-parent, -is_root[i]])

                # no_parents and at least one child implies is_root
                parents_of_i.append(is_root[i])
                for child in list(parents[i, :]):
                    tmp = parents_of_i.copy()
                    tmp.append(-child)
                    clauses.append(tmp)

            # single root
            for i in range(is_root.shape[0]):
                for j in range(i):
                    clauses.append([-is_root[i], -is_root[j]])

        else:
            abort(501, "The page constraint {} is not implemented yet".format(page_constraint))
        return clauses

    @staticmethod
    def _add_forrest_constraints(ancestors, assignment_variables, clauses, edges, page_idx, parents):
        """
        A helper method to encode a forest constraint for the given page.
        :param ancestors:
        :param assignment_variables:
        :param clauses:
        :param edges:
        :param page_idx:
        :param parents:
                """
        for i in range(edges.shape[0]):
            e1 = edges[i]
            e1_idx = e1[0]
            e1n1 = e1[1]
            e1n2 = e1[2]
            edge_on_page = assignment_variables[page_idx, e1_idx]
            n1_is_parent_of_n2 = parents[e1n1, e1n2]
            n2_is_parent_of_n1 = parents[e1n2, e1n1]

            # either n1 or n2 is the parent of the other one
            # sympy.to_cnf(edge_on_page >> (n1_is_parent_of_n2 ^ n2_is_parent_of_n1))
            clauses.append([-edge_on_page, n1_is_parent_of_n2, n2_is_parent_of_n1])
            clauses.append([-edge_on_page, -n1_is_parent_of_n2, -n2_is_parent_of_n1])

            # no one is parent if the edge is not on this page
            # sympy.to_cnf(~edge_on_page >> (~n1_is_parent_of_n2 & ~n2_is_parent_of_n1))
            clauses.append([edge_on_page, -n1_is_parent_of_n2])
            clauses.append([edge_on_page, -n2_is_parent_of_n1])
        # make sure every unused parent var is false and take away the dont care variable from the solver
        used_ids = {np.abs(item) for sublist in clauses for item in sublist}
        for i in range(parents.shape[0]):
            for j in range(parents.shape[0]):
                if parents[j, i] not in used_ids:
                    clauses.append([-parents[j, i]])
        # at most one parent for each node
        for i in range(parents.shape[0]):
            parents_of_i = parents[:, i]
            for j in range(len(parents_of_i)):
                if j == i:
                    continue
                for k in range(j):
                    if k == i or j == k:
                        continue
                    clauses.append([-parents[j, i], -parents[k, i]])
        # every node is not its own parent
        for i in range(parents.shape[0]):
            clauses.append([-parents[i, i]])
        # if i is parent of j then i is also ancestor of j
        for i in range(parents.shape[0]):
            for j in range(parents.shape[0]):
                clauses.append([-parents[j, i], ancestors[j, i]])
        for i in range(ancestors.shape[0]):
            clauses.append([-ancestors[i, i]])
            for j in range(ancestors.shape[0]):
                if i == j:
                    continue
                # one of both relations have to be false
                clauses.append([-ancestors[i, j], -ancestors[j, i]])

                # ensure transitivity
                for k in range(ancestors.shape[0]):
                    if i == j or j == k or k == i:
                        continue
                    # (i_anc_of_j & j_anc_of_k) >> i_anc_of_k
                    clauses.append([-ancestors[i, j], -parents[j, k], ancestors[i, k]])
