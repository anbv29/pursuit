"""Keep OAuth authorization codes and bearer share URLs out of HTTP access logs."""

import logging
import re


def safe_path(path):
    path = re.sub(r"(/(?:api/shared-reports|shared)/)[^? /]+", r"\1[redacted]", path)
    if "/fo/oauth/callback" in path:
        path = path.split("?", 1)[0] + "?[redacted]"
    return path


class AccessRedaction(logging.Filter):
    def filter(self, record):
        if isinstance(record.args, tuple) and len(record.args) >= 3:
            args = list(record.args)
            args[2] = safe_path(str(args[2]))
            record.args = tuple(args)
        return True
