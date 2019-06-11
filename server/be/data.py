import sqlite3
from sqlite3 import Cursor

from flask import json

init_sql = """CREATE TABLE IF NOT EXISTS layouts (
 content TEXT NOT NULL
);"""

insert_layout_sql = """
INSERT INTO layouts (content) VALUES (?)"""

get_layout_by_id_sql = """
SELECT ROWID,content 
FROM layouts WHERE rowid == (?)"""

get_all_layouts_sql = """
SELECT content 
FROM layouts"""

update_layout_by_id_sql = """
UPDATE layouts
SET content = (?) WHERE ROWID == (?)"""


class DataStore(object):

    def __init__(self, data_path):
        self.data_path = data_path
        with self.get_connection() as conn:
            c = conn.cursor()
            c.execute(init_sql)
            conn.commit()
            c.close()

    def insert_new_element(self, element):
        json_str = json.dumps(element)
        with self.get_connection() as conn:
            c = conn.cursor()
            c.execute(insert_layout_sql, (json_str,))
            last_id = c.lastrowid
            element['id'] = last_id
            conn.commit()
        self.updateEntry(last_id, element)
        return element

    def get_connection(self):
        return sqlite3.connect(self.data_path)

    def get_all(self):
        with self.get_connection() as conn:
            c: Cursor = conn.cursor()
            c.execute(get_all_layouts_sql, ())
            results = c.fetchall()
            res = []
            for result in results:
                res.append(json.loads(result[0]))
        return res

    def get_by_id(self, elem_id):
        with self.get_connection() as conn:
            c: Cursor = conn.cursor()
            c.execute(get_layout_by_id_sql, (elem_id,))
            result = c.fetchone()
        if result is None:
            return None
        element = json.loads(result[1])
        element['id'] = str(result[0])
        return element

    def updateEntry(self, elem_id, element):
        element['id'] = str(elem_id)
        json_str = json.dumps(element)
        with self.get_connection() as conn:
            c: Cursor = conn.cursor()
            c.execute(update_layout_by_id_sql, (json_str, elem_id))
            conn.commit()
        return element
