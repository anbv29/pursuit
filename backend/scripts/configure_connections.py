"""Create the local encryption key once. Never prints or commits credentials."""

from pathlib import Path

from cryptography.fernet import Fernet

path = Path(__file__).resolve().parents[1] / ".env"
lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
configured = any(
    line.startswith("CONNECTION_ENCRYPTION_KEY=") and line.split("=", 1)[1].strip() for line in lines
)
if not configured:
    lines = [line for line in lines if not line.startswith("CONNECTION_ENCRYPTION_KEY=")]
    lines.append("CONNECTION_ENCRYPTION_KEY=" + Fernet.generate_key().decode())
    path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print("Local connection encryption configured. Keep backend/.env private and preserve this key.")
else:
    print("Connection encryption is already configured; existing key preserved.")
