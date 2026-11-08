"""Choose an isolated test URL before application modules are imported."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
