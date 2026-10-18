"""Keep OAuth authorization codes and bearer share URLs out of HTTP access logs."""

import logging
import re


class AccessRedaction(logging.Filter):
    def filter(self, record):
        if isinstance(record.args, tuple) and len(record.args) >= 3:
            args = list(record.args)
            path = str(args[2])
            path = re.sub(r"(/api/shared-reports/)[^? /]+", r"\1[redacted]", path)
            if "/fo/oauth/callback" in path:
                path = path.split("?", 1)[0] + "?[redacted]"
            args[2] = path
            record.args = tuple(args)
        return True
