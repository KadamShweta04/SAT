from datetime import timedelta
from functools import wraps

import numpy as np
from time import time


def measure(func):
    @wraps(func)
    def _time_it(*args, **kwargs):
        start = int(round(time() * 1000))
        try:
            return func(*args, **kwargs)
        finally:
            end_ = int(round(time() * 1000)) - start
            print(f"Total execution time: {end_ if end_ > 0 else 0} ms")

    return _time_it


import timeit

PRINT_TIMINGS = True


def set_printing(value):
    global PRINT_TIMINGS
    PRINT_TIMINGS = value


class CodeTimer:
    def __init__(self, name=None, do_print=None):
        self.do_print = do_print
        self.name = " '" + name + "'" if name else ''

    def __enter__(self):
        self.start = timeit.default_timer()

    def __exit__(self, exc_type, exc_value, traceback):
        self.took = (timeit.default_timer() - self.start) * 1000.0
        if self.do_print or PRINT_TIMINGS:
            print('Code block' + self.name + ' took: ' + str(timedelta(milliseconds=self.took)) + ' s')


def get_duplicates(my_list: list) -> list:
    items = np.array(my_list)
    s = np.sort(items)
    duplicates = s[:-1][s[1:] == s[:-1]]
    return duplicates.tolist()
