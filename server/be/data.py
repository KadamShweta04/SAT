import sqlite3
from sqlite3 import Cursor

from flask import json

init_sql = """
CREATE TABLE IF NOT EXISTS layouts (
 content TEXT NOT NULL
);"""

insert_layout_sql = """
INSERT INTO layouts (content) VALUES (?)"""

get_layout_by_id_sql = """
SELECT ROWID,content 
FROM layouts WHERE rowid == (?)"""

get_all_layouts_sql = """
SELECT content 
FROM layouts
ORDER BY ROWID DESC 
LIMIT (?) OFFSET (?)"""

update_layout_by_id_sql = """
UPDATE layouts
SET content = (?) WHERE ROWID == (?)"""


class DataStore(object):
    """
    This class abstracts the underlying data store from the application. It provides methods to perform insert new data
    and to obtain already stored data
    """

    def __init__(self, data_path):
        """
        Initialises the datastore if it is not already initialised

        :param data_path: the path to use for the data store
        """
        self.data_path = data_path
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute(init_sql)
            conn.commit()
            c.close()

    def insert_new_element(self, element):
        """
        Inserts a new elements into the data store and return the inserted element including the generated id

        :param element: the element to store
        :return: the stored element
        """
        json_str = json.dumps(element)
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute(insert_layout_sql, (json_str,))
            last_id = c.lastrowid
            element['id'] = last_id
            conn.commit()
        self.update_entry(last_id, element)
        return element

    def _get_connection(self):
        return sqlite3.connect(self.data_path)

    def get_all(self, limit=20, offset=0):
        """
        This method obtains multiple stored elements. Also provides parameters to implement pagination

        :param limit: the number of elements to return at max
        :param offset: the offset where to start
        :return: a list of elements
        """
        with self._get_connection() as conn:
            c: Cursor = conn.cursor()
            c.execute(get_all_layouts_sql, (limit, offset))
            results = c.fetchall()
            res = []
            for result in results:
                res.append(json.loads(result[0]))
        return res

    def get_by_id(self, elem_id):
        """
        Obtains an element by id

        :param elem_id: the element id
        :return: the element or None if the id was not found.
        """
        with self._get_connection() as conn:
            c: Cursor = conn.cursor()
            c.execute(get_layout_by_id_sql, (elem_id,))
            result = c.fetchone()
        if result is None:
            return None
        element = json.loads(result[1])
        element['id'] = str(result[0])
        return element

    def update_entry(self, elem_id, element):
        """
        Updates the entry with the given id to contain the new contents

        :param elem_id: the element id
        :param element: the new element content
        :return: the updated element
        """
        element['id'] = str(elem_id)
        json_str = json.dumps(element)
        with self._get_connection() as conn:
            c: Cursor = conn.cursor()
            c.execute(update_layout_by_id_sql, (json_str, elem_id))
            conn.commit()
        return element
