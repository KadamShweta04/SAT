.. On ll with SAT documentation master file, created by
   sphinx-quickstart on Sat Jun 29 18:46:25 2019.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.


####################################
On linear layouts of graphs with SAT
####################################

.. contents:: Table of Contents
   :depth: 3

***************************
Fundamentals and Frameworks
***************************

  * REST Apis
  * Python
  * Flask
  * Flask-restplus
  * Sqlite
  * SAT solving


Setup project
=============

********************
Theoretical baseline
********************

Linear layout
=============

Book embedding:

  * Rules

Queue embedding

  * Rules

Encoding with SAT
=================

  * Node order
  * Edge to page assignment
  * Tree
  * Dispensable

Constraints
-----------

   * EDGES_ON_PAGES
   * EDGES_SAME_PAGES
   * EDGES_DIFFERENT_PAGES
   * EDGES_TO_SUB_ARC_ON_PAGES
   * EDGES_FROM_NODES_ON_PAGES
   * NODES_PREDECESSOR
   * NODES_ABSOLUTE_ORDER
   * NODES_FORBID_PARTIAL_ORDER
   * NODES_REQUIRE_PARTIAL_ORDER
   * NODES_CONSECUTIVE

**************
Implementation
**************
TODO
 Arch diagramm
Flow diagramm
Input/Output

less technical

presntation 20 minutes

.. automodule:: be
   :members:

Core Classes
============

.. automodule:: be.app
   :members:

.. autoclass:: be.model.SatModel
   :members:

Auxiliary classes
=================

The parsing of the graphml string happens on a low level xml basis without constructing a graph. The only validation will be to check if the nodes referenced by the edges are actually present.

As id are taken from the following hierarchy: Userdata at the xml element, id of the xml element, for edges generated from <source node>-<target node>. This hierarchy ensures that the API can use a wide variety of valid graphml as input.

The following interface is provided:

.. automodule:: be.graphml_parser
   :members:

The following module is the glue code between the :class:`.App`: class which handles the external interface and the :class:`.SatModel`: class which does the heavy lifting in creating the SAT clauses and calling the SAT solver.

.. automodule:: be.solver
   :members:


Performance Analysis
====================

This chapter sheds light on the particular hot spots of the application regarding technical optimization.

The Following snippet shows the time  the python interpreter needed for the different methods. This was measured by the ProfilerMiddleware (TODO Link) of werkzeug (TODO link)::

   PATH: '/embeddings'
            2387712 function calls (2381351 primitive calls) in 4.810 seconds

      Ordered by: internal time, call count
      List reduced from 617 to 30 due to restriction <30>

      ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        5059    1.163    0.000    1.163    0.000 {method 'poll' of 'select.poll' objects}
           1    0.868    0.868    0.934    0.934 /Uni/forschungsarbeit/SAT/server/be/model.py:72(static_to_dimacs)
           5    0.668    0.134    2.027    0.405 /Uni/forschungsarbeit/SAT/server/be/model.py:728(node_constraint_stack)
           1    0.456    0.456    0.483    0.483 /Uni/forschungsarbeit/SAT/server/be/model.py:11(static_node_order_generation)
      395040    0.415    0.000    0.484    0.000 /Uni/forschungsarbeit/SAT/server/be/model.py:53(static_get_order_clauses)
      152353    0.375    0.000    0.375    0.000 {built-in method numpy.array}
       51485    0.154    0.000    0.500    0.000 /Uni/forschungsarbeit/SAT/server/be/utils.py:45(get_duplicates)
       51485    0.110    0.000    0.110    0.000 {method 'sort' of 'numpy.ndarray' objects}
      100865    0.094    0.000    0.094    0.000 {method 'tolist' of 'numpy.ndarray' objects}
      839228    0.069    0.000    0.069    0.000 {method 'append' of 'list' objects}
           1    0.068    0.068    4.756    4.756 /Uni/forschungsarbeit/SAT/server/be/solver.py:15(solve)
       51485    0.065    0.000    0.065    0.000 {method 'copy' of 'numpy.ndarray' objects}
       51485    0.046    0.000    0.256    0.000 /home/mirco/.local/share/virtualenvs/server-qznNmo4Y/lib/python3.6/site-packages/numpy/core/fromnumeric.py:815(sort)
   508258/508257    0.041    0.000    0.041    0.000 {built-in method builtins.len}
           1    0.036    0.036    0.036    0.036 {method 'translate' of 'str' objects}
           3    0.031    0.010    0.031    0.010 {method 'commit' of 'sqlite3.Connection' objects}
          12    0.030    0.003    0.030    0.003 {method 'replace' of 'str' objects}
           1    0.020    0.020    1.216    1.216 /home/mirco/.pyenv/versions/3.6.8/lib/python3.6/subprocess.py:1486(_communicate)
       50097    0.018    0.000    0.018    0.000 {method 'extend' of 'list' objects}
        5059    0.013    0.000    1.179    0.000 /home/mirco/.pyenv/versions/3.6.8/lib/python3.6/selectors.py:365(select)
       51485    0.013    0.000    0.035    0.000 /home/mirco/.local/share/virtualenvs/server-qznNmo4Y/lib/python3.6/site-packages/numpy/core/numeric.py:541(asanyarray)
        5040    0.011    0.000    0.011    0.000 {built-in method posix.write}
           1    0.003    0.003    1.224    1.224 /Uni/forschungsarbeit/SAT/server/be/solver.py:57(_call_lingeling_with_string)
     3814/38    0.003    0.000    0.008    0.000 /home/mirco/.local/share/virtualenvs/server-qznNmo4Y/lib/python3.6/copy.py:132(deepcopy)
           1    0.003    0.003    2.036    2.036 /Uni/forschungsarbeit/SAT/server/be/model.py:359(add_page_type_constraints)
          21    0.002    0.000    0.002    0.000 {built-in method posix.read}

The `tottime` defines the time the interpreter ran this particular method without jumping to a sub method. The first line here `{method 'poll' of 'select.poll' objects}` is actually the waiting loop for the SAT solver to finish.

The first method which is self implemented is the call to `static_to_dimacs` which is why this method got fairly much attention in order to get optimized as much as possible. See sub section one of this chapter.


DIMACS File generation
----------------------


.. image:: sphinx-doc/_static/performance/toDimacs.png
   :scale: 100 %
   :alt: Comparison DIMACS generation
   :align: center

General Clause generation attempts
----------------------------------

  * Sympy
  * Lists of ints
  * Numpy
