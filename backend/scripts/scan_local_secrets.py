"""Read-only scan: output counts only, never secret values or matched lines."""

import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit

from dotenv import dotenv_values

root = Path(__file__).resolve().parents[2]
values = set()
for file in (root / "backend/.env", root / "backend/.env.preview", root / "frontend/.env.local"):
    if not file.exists():
        continue
    for name, value in dotenv_values(file).items():
        if not value:
            continue
        if any(word in name.upper() for word in ("KEY", "TOKEN", "PASSWORD", "SECRET")) and len(value) >= 16:
            values.add(value.encode())
        if "DATABASE_URL" in name:
            password = urlsplit(value).password
            if password and len(password) >= 16:
                values.add(unquote(password).encode())
patterns = [
    rb"sk-ant-[A-Za-z0-9_-]{30,}",
    rb"gh[pousr]_[A-Za-z0-9]{30,}",
    rb"AKIA[A-Z0-9]{16}",
    rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
]


def hits(data):
    return any(secret in data for secret in values) or any(re.search(pattern, data) for pattern in patterns)


git = shutil.which("git")
if not git:
    raise SystemExit("Git is required for this scan.")
# Resolved local Git executable, fixed arguments, no shell or user-supplied arguments.
tracked = subprocess.check_output([git, "ls-files", "-z"], cwd=root).split(b"\0")  # noqa: S603
source_hits = sum(
    hits((root / path.decode()).read_bytes()) for path in tracked if path and (root / path.decode()).is_file()
)
history = subprocess.check_output(  # noqa: S603
    [git, "log", "--all", "-p", "--format=", "--no-ext-diff"], cwd=root
)
bundle_files = list((root / "frontend/.next-build/static").rglob("*.js"))
bundle_hits = sum(hits(path.read_bytes()) for path in bundle_files)
print(
    f"Known private values checked: {len(values)}; tracked-file matches: {source_hits}; "
    f"history match: {hits(history)}; client-bundle matches: {bundle_hits} ({len(bundle_files)} files)."
)
raise SystemExit(bool(source_hits or hits(history) or bundle_hits))
