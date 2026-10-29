"""Idempotent Solr schema setup via the Schema API, so no XML configset is needed."""

import httpx

from .embedder import DIM

VECTOR_TYPE = {
    "name": f"knn_vector_{DIM}",
    "class": "solr.DenseVectorField",
    "vectorDimension": DIM,
    "similarityFunction": "dot_product",  # vectors are L2-normalized, so dot product == cosine
}

FACET_FIELDS = ["gender", "master_category", "sub_category", "article_type", "base_colour", "season", "usage"]

FIELDS = [
    {"name": "name", "type": "text_en", "stored": True},
    {"name": "search_text", "type": "text_en", "stored": False, "multiValued": True},
    *({"name": f, "type": "string", "stored": True, "docValues": True} for f in FACET_FIELDS),
    {"name": "year", "type": "pint", "stored": True},
    {"name": "image_path", "type": "string", "stored": True, "indexed": False},
    {"name": "image_vector", "type": VECTOR_TYPE["name"], "stored": True},
]

# Lexical search matches on these through one analyzed field.
COPY_SOURCES = ["name", "article_type", "sub_category", "base_colour", "usage", "gender", "season"]


def ensure_schema(client: httpx.Client) -> None:
    client.post("/config", json={"set-user-property": {"update.autoCreateFields": "false"}}).raise_for_status()

    types = {t["name"] for t in client.get("/schema/fieldtypes").json()["fieldTypes"]}
    if VECTOR_TYPE["name"] not in types:
        _schema(client, {"add-field-type": VECTOR_TYPE})

    fields = {f["name"] for f in client.get("/schema/fields").json()["fields"]}
    missing = [f for f in FIELDS if f["name"] not in fields]
    if missing:
        _schema(client, {"add-field": missing})

    copies = {(c["source"], c["dest"]) for c in client.get("/schema/copyfields").json()["copyFields"]}
    new_copies = [{"source": s, "dest": "search_text"} for s in COPY_SOURCES if (s, "search_text") not in copies]
    if new_copies:
        _schema(client, {"add-copy-field": new_copies})


def _schema(client: httpx.Client, command: dict) -> None:
    res = client.post("/schema", json=command)
    if res.status_code >= 400:
        raise RuntimeError(f"Solr schema update failed: {res.text}")
