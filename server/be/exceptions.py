class NotSatisfiableException(Exception):
    pass


class IdRelatedException(Exception):
    def __init__(self, entity_id, message):
        self.entity_id = entity_id
        self.message = message
