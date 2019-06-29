from typing import List

from lxml import etree

from be.custom_types import Edge


def get_nodes_and_edges_from_graph(string: str) -> (List[str], List[Edge]):
    """
    Obtains node and enge information from a string containing a graphml definition.
    For the ids or the elements, the userdata is used first. If there is none then the xml ids of the elements are used.
    For edges the xml id is not mandatory and therefor if neither userdata nor xml id is present for edges then the used
    ids are consisting of `<SOURCE_NODE_ID>-<TARGET_NODE_ID>`

    :param: the graphml string
    :return: the lists of node ids and edges
    """
    parser = etree.XMLParser(remove_blank_text=True)

    id_tag_key = None
    root = etree.XML(string, parser=parser)
    for child in root:
        if child.get('attr.name') == "UserTags":
            id_tag_key = child.get('id')
            break

    graph_ns = '{http://graphml.graphdrawing.org/xmlns}'
    graph_root = root.findall('{}graph'.format(graph_ns))
    if len(graph_root) == 0:
        graph_ns = ""
    graph_root = root.findall('{}graph'.format(graph_ns))[0]

    xml_nodes = graph_root.findall('{}node'.format(graph_ns))

    node_id_mapping = {}

    for xml_node in xml_nodes:
        real_id = xml_node.get('id')
        custom_id = xml_node.get('id')

        if id_tag_key:
            for data_element in xml_node.findall('{}data'.format(graph_ns)):
                if data_element.get('key') == id_tag_key:
                    custom_id = data_element[0].text
                    break
        node_id_mapping[real_id] = custom_id

    xml_edges = graph_root.findall('{}edge'.format(graph_ns))

    edges = []

    for xml_edge in xml_edges:
        custom_id = xml_edge.get('id')
        source = xml_edge.get('source')
        target = xml_edge.get('target')

        if id_tag_key:
            for data_element in xml_edge.findall('{}data'.format(graph_ns)):
                if data_element.get('key') == id_tag_key:
                    custom_id = data_element[0].text
                    break
        if not custom_id:
            custom_id = "{}-{}".format(source, target)

        edges.append(Edge(custom_id, node_id_mapping[source], node_id_mapping[target]))

    return list(node_id_mapping.values()), edges
