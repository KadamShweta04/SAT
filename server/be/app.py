import base64
import datetime
import multiprocessing
from concurrent.futures import Future
from concurrent.futures.process import ProcessPoolExecutor

from flask import Flask, request
from flask.json import jsonify
from flask_cors import CORS
from flask_restplus import Resource, Api, fields
from werkzeug.exceptions import BadRequest, abort, NotFound, InternalServerError, HTTPException

from be.custom_types import SolverResult
from be.data import DataStore
from be.exceptions import IdRelatedException
from be.graphml_parser import get_nodes_and_edges_from_graph
from be.solver import SolverInterface
from be.utils import get_duplicates


class App:
    """
    This class creates the entry point for the REST interface.
    The entry point will perform all marshalling and un marshalling operations.
    Also will the entry point provide some basic sanitation to the given input. The non complete list of checks are:

    * Duplicated ids
    * Graph size withing fairness bounds
    * Structural verification

    """

    #: The path used to store the database file
    data_path = "data.db"

    _k3_str_as_example = "PGdyYXBobWwgeG1sbnM9Imh0dHA6Ly9ncmFwaG1sLmdyYXBoZHJhd2luZy5vcmcveG1sbnMiIHhtbG5zOnhzaT0ia" \
                         "HR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiCiAgICAgICAgIHhzaTpzY2hlbWFMb2NhdG" \
                         "lvbj0iaHR0cDovL2dyYXBobWwuZ3JhcGhkcmF3aW5nLm9yZy94bWxucyBodHRwOi8vZ3JhcGhtbC5ncmFwaGRyYXd" \
                         "pbmcub3JnL3htbG5zLzEuMC9ncmFwaG1sLnhzZCI+CiAgICA8Z3JhcGggZWRnZWRlZmF1bHQ9InVuZGlyZWN0ZWQi" \
                         "PgogICAgICAgIDxub2RlIGlkPSIwIi8+CiAgICAgICAgPG5vZGUgaWQ9IjEiLz4KICAgICAgICA8bm9kZSBpZD0iM" \
                         "iIvPgogICAgICAgIDxlZGdlIHNvdXJjZT0iMCIgdGFyZ2V0PSIxIi8+CiAgICAgICAgPGVkZ2Ugc291cmNlPSIwIi" \
                         "B0YXJnZXQ9IjIiLz4KICAgICAgICA8ZWRnZSBzb3VyY2U9IjEiIHRhcmdldD0iMiIvPgogICAgPC9ncmFwaD4KPC9" \
                         "ncmFwaG1sPg=="

    def create_app(self) -> Flask:
        """
        Initialises the the app and the api object. It adds all the provided endpoints.
        Also does this method define the documentation for the swagger UI and the definitions for the api object
        structure.

        :returns:
            the app object
        """
        app = Flask(__name__)
        if app.config['DEBUG']:
            app.config['PROFILE'] = True
            from werkzeug.middleware.profiler import ProfilerMiddleware
            app.wsgi_app = ProfilerMiddleware(app.wsgi_app, restrictions=[30])
        CORS(app)

        pool = ProcessPoolExecutor(max_workers=int(multiprocessing.cpu_count() / 2))

        app.config['RESTPLUS_VALIDATE'] = True

        data_store = DataStore(self.data_path)

        api = Api(app, version='1.0', title='Linear layout API',
                  description='Through this API one can request for a linear layout of a graph in graphml format. \n'
                              'The actual computation of the linear layout is done using SAT solving. '
                              'The instances are solved using [lingeling](http://fmv.jku.at/lingeling/)\n'
                  )

        page_schema = api.model('Page',
                                {
                                    'id': fields.String(required=True, description='The id of this page', example="P1"),
                                    'type': fields.String(description='The type of the page. '
                                                                      'MIXED allows all patterns',
                                                          enum=['QUEUE',
                                                                'STACK',
                                                                'MIXED'],
                                                          required=True),
                                    'constraint': fields.String(description='Additional constraints for the page',
                                                                enum=[
                                                                    'NONE',
                                                                    'DISPERSIBLE',
                                                                    'TREE',
                                                                    'FOREST'
                                                                    # TODO Order of 1(DISPERSIBLE) 2(2edges per node)
                                                                ])
                                })

        constraint_schema = api.model('Constraint',
                                      {'type': fields.String(description="""
                                      EDGES_ON_PAGES: assigns edges to specific pages
                                      arguments: edge ids, the edge ids are handled independent from each other
                                      modifier: page ids to assign the edges to (OR joined)
                                      
                                      EDGES_SAME_PAGES: assigns edges to the same page. Only implemented up to to 4 pages
                                      arguments: the edge ids to be assigned to the same page
                                      modifier: empty
                                      
                                      EDGES_DIFFERENT_PAGES: all edges have to be on different pages
                                      arguments: the edge ids
                                      modifier none
                                      
                                      EDGES_TO_SUB_ARC_ON_PAGES: If any node shares an edge with the nodes named in 
                                      arguments and is between the two nodes, 
                                      then this edge is restricted to the pages in modifier
                                      as endpoint are only allowed on the two named pages. 
                                      arguments: the two vertexes to restrict the edges from
                                      modifier: the pages to restrict the edges to
                                      
                                      EDGES_FROM_NODES_ON_PAGES: All edges involving the nodes have to be on the given page. 
                                      arguments: the vertexes to restrict the edges from
                                      modifier: the pages to restrict the edges to
                                      
                                      NODES_PREDECESSOR: one set of nodes are before another set of nodes
                                      arguments: the node ids to be before 
                                      modifier: the node ids to be after
                                      
                                      NODES_ABSOLUTE_ORDER: The given nodes have to be in exactly the given order and no nodes 
                                      are allowed in between
                                      arguments: the nodes in the required order
                                      modifier: none 
                                      
                                      NODES_REQUIRE_PARTIAL_ORDER: The given nodes have to be the given relative order
                                      arguments: the nodes in the order
                                      modifier: none 
                                      
                                      NODES_FORBID_PARTIAL_ORDER: The given nodes have to be NOT the given relative order. 
                                      Two nodes flipped already satisfy this constraint
                                      arguments: the nodes in the forbidden order
                                      modifier: none 
                                      
                                      NODES_CONSECUTIVE: The given two nodes have to be next to each other in any order. 
                                      Currently only implemented for 2 Nodes
                                      arguments: the two neighboring nodes
                                      modifier: none  
                                      """,
                                                             enum=[
                                                                 "EDGES_ON_PAGES",
                                                                 "EDGES_SAME_PAGES",
                                                                 "EDGES_DIFFERENT_PAGES",
                                                                 "EDGES_TO_SUB_ARC_ON_PAGES",
                                                                 "EDGES_FROM_NODES_ON_PAGES",
                                                                 "NODES_PREDECESSOR",
                                                                 "NODES_ABSOLUTE_ORDER",
                                                                 "NODES_REQUIRE_PARTIAL_ORDER",
                                                                 "NODES_FORBID_PARTIAL_ORDER",
                                                                 "NODES_CONSECUTIVE",
                                                                 # todo pattern constraint
                                                             ],
                                                             example="NODES_PREDECESSOR",
                                                             required=True),
                                       'arguments':
                                           fields.List(fields.String,
                                                       min_items=1, required=True,
                                                       description='The ids of the elements affected by this constraint',
                                                       example=["1"]
                                                       ),
                                       'modifier': fields.List(fields.String,
                                                               description='The ids of the constraint modifier.',
                                                               example=["0"]),
                                       },
                                      )
        assigment_schema = api.model(
            'Assigment',
            {
                'edge': fields.String(description='The id of the edge', required=True),
                'page': fields.String(description='The id of the page the edge is assigned to', required=True)
            })
        error_schema = api.model(
            'Error',
            {
                'message': fields.String(description='The error message', required=True, readonly=True)
            })
        book_embedding_schema = api.model(
            'Book embedding',
            {
                'id': fields.Integer(description='The id of the embedding', readonly=True),
                'graph': fields.String(description='This field contains a graphml definition encoded with base64. '
                                                   'The example value is K3.',
                                       required=True, example=self._k3_str_as_example),
                'pages': fields.List(fields.Nested(page_schema), min_items=1, required=True, unique=True),
                'constraints': fields.List(fields.Nested(constraint_schema)),
                'status': fields.String(description='The current processing status of the computation',
                                        enum=['IN_QUEUE', 'IN_PROGRESS', 'FINISHED', 'FAILED'], readonly=True),
                'assignments': fields.List(fields.Nested(assigment_schema), readonly=True,
                                           description='A list of edge to page assignments'),
                'vertex_order': fields.List(fields.String, readonly=True,
                                            description='The order in which the vertexes have to be placed on the spine.'),
                'satisfiable': fields.Boolean(readonly=True,
                                              description='On finished instances this field indicates if the given '
                                                          'problem is satisfiable'),
                'rawSolverResult': fields.String(readonly=True,
                                                 description='This field contains the comment lines of the solver which '
                                                             'provides some data on the solved SAT instance'),
                'message': fields.String(readonly=True,
                                         description="This field contains currently the error message from "
                                                     "the background processing"),
                'created': fields.DateTime(readonly=True,
                                           description='A timestamp when this instance was created')
            })

        parser = api.parser()
        parser.add_argument('limit', type=int, help='How many objects should be returned', location='query', default=20)
        parser.add_argument('offset', type=int, help='Where to start counting', location='query', default=0)

        @api.route('/embeddings')
        class EmbeddingList(Resource):

            @api.doc('list_embeddings')
            @api.response(code=200, description="Success", model=[book_embedding_schema])
            @api.response(code=500, description="Server Error", model=error_schema)
            @api.expect(parser)
            def get(self):
                """
                List all embeddings
                """

                limit = int(request.args.get('limit', 20))
                if (limit < 1) or (limit > 50):
                    abort(400, "limit has to be in range [1,50]")
                offset = int(request.args.get('offset', 0))
                if offset < 0:
                    abort(400, "offset has to be not negative")

                # TODO implement pagination
                return jsonify(data_store.get_all(limit=limit, offset=offset))

            @api.doc('create_embedding')
            @api.expect(book_embedding_schema)
            @api.response(code=200, description="Success", model=book_embedding_schema)
            @api.response(code=500, description="Server Error", model=error_schema)
            @api.response(code=501, description="Not Implemented", model=error_schema)
            @api.response(code=400, description="Bad Request", model=error_schema)
            def post(self):
                """
                Create a new embedding
                """
                entity = request.get_json()

                handle_async = False
                try:
                    entity['created'] = datetime.datetime.now(datetime.timezone.utc).isoformat()

                    b64_graph_str = entity.get('graph')
                    try:
                        graph_str = base64.b64decode(b64_graph_str)
                        node_ids, edges = get_nodes_and_edges_from_graph(graph_str)
                    except Exception as e:
                        app.logger.exception(e)
                        raise BadRequest("The graph string has to be a base64 encoded graphml string! "
                                         "The exact error was: " + str(e))

                    len_nodes = len(node_ids)
                    len_edges = len(edges)

                    if len_edges > 900 or len_nodes > 300:
                        raise BadRequest(
                            "For fairness reasons this API will only handle graphs with less than 300 vertices and 900 "
                            "edges. Your graph has {} vertices and {} edges which exceed the limit."
                            "".format(len_nodes, len_edges))

                    for e in edges:
                        if e.source == e.target:
                            raise BadRequest(
                                "The Implementation only supports graphs where "
                                "every edge has two distinct start and end nodes")

                    # validate for no double edges
                    all_edge_endpoints = [{e.source, e.target} for e in edges]
                    duplicate_edges = get_duplicates(all_edge_endpoints)
                    if len(duplicate_edges) > 0:
                        abort(400,
                              "Multiedges are not allowed. "
                              "The following edges were recognized as duplicate {}".format(duplicate_edges))

                    # validate page id uniqueness
                    page_ids = [p['id'] for p in entity.get('pages')]
                    duplicate_page_ids = get_duplicates(page_ids)
                    if len(duplicate_page_ids) > 0:
                        abort(400,
                              "Duplicated page ids are not allowed. "
                              "The following id were recognized as duplicate {}".format(duplicate_page_ids))

                    entity['status'] = 'IN_PROGRESS'
                    entity = data_store.insert_new_element(entity)

                    # validate graph not empty
                    if len(page_ids) == 0 or len_edges == 0 or len_nodes == 0:
                        abort(400,
                              "Please submit a graph with at least one node, edge and page")

                    if handle_async:
                        future = pool.submit(SolverInterface.solve,
                                             node_ids, edges, entity.get('pages'), entity.get('constraints'),
                                             entity['id'])
                        future.add_done_callback(processing_finished_callback)
                    else:
                        entity = handle_solver_result(SolverInterface.solve(
                            node_ids, edges, entity.get('pages'), entity.get('constraints'), entity['id']))

                    return jsonify(entity)
                except HTTPException as e:
                    raise e
                except Exception as e:
                    raise InternalServerError(
                        "The error {} \noccured from this body \n{}".format(str(e),
                                                                            request.get_data(as_text=True))) from e

        @api.route('/embeddings/<int:id>')
        @api.response(404, 'Embedding not found', model=error_schema)
        @api.param('id', 'The task identifier')
        class SingleEmbedding(Resource):

            @api.doc('get_embedding')
            @api.response(code=200, description="Success", model=book_embedding_schema)
            def get(self, id):
                """
                Get an embedding by id
                """
                element = data_store.get_by_id(id)
                if not element:
                    raise NotFound("The given id {} was not present in the data store".format(id))
                else:
                    return jsonify(element)

        def processing_finished_callback(future: Future):
            if not future.done() or future.cancelled():
                return
            try:
                result = future.result()

                handle_solver_result(result)

            except IdRelatedException as e:
                id = e.entity_id
                entity = data_store.get_by_id(id)
                if not entity:
                    raise e
                entity['status'] = 'FAILED'
                entity['message'] = e.message

                data_store.update_entry(id, entity)
                raise e

            pass

        def handle_solver_result(result: SolverResult):
            entity = data_store.get_by_id(result.entity_id)
            if not entity:
                raise Exception("The given id {} was not found in the data store".format(result.entity_id))
            entity['status'] = 'FINISHED'
            entity['satisfiable'] = result.satisfiable
            entity['assignments'] = result.page_assignments
            entity['vertex_order'] = result.vertex_order
            entity['rawSolverResult'] = result.solver_output
            entity = data_store.update_entry(result.entity_id, entity)
            return entity

        return app


app = App().create_app()
