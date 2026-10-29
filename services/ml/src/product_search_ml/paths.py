import os
from pathlib import Path

# In a checkout this file is services/ml/src/product_search_ml/paths.py, four levels below the repo.
# The Docker image has no repo around the package, so fall back to / and rely on explicit paths there.
_parents = Path(__file__).resolve().parents
REPO_ROOT = Path(os.getenv("REPO_ROOT") or (_parents[4] if len(_parents) > 4 else _parents[-1]))
