from typing import NamedTuple, List


class Edge(NamedTuple):
    id: str
    source: str
    target: str


class PageAssignment(NamedTuple):
    edge: str
    page: str


class Constraint(NamedTuple):
    type: str
    arguments: List[str]
    modifier: List[str]


class SolverResult(NamedTuple):
    satisfiable: bool
    page_assignments: List[PageAssignment]
    vertex_order: List[str]
    solver_output: str
    entity_id: str
