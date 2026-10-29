"""Download the catalog, embed every product image with CLIP, and index into Solr."""

import argparse
import os
from itertools import islice
from pathlib import Path

import httpx
from datasets import load_dataset
from tqdm import tqdm

from .embedder import ClipEmbedder
from .paths import REPO_ROOT
from .solr_schema import ensure_schema

DATASET = "ashraq/fashion-product-images-small"


def batched(iterable, size):
    it = iter(iterable)
    while batch := list(islice(it, size)):
        yield batch


def to_doc(row: dict, vector: list[float]) -> dict:
    year = row.get("year")
    doc = {
        "id": str(row["id"]),
        "name": row["productDisplayName"],
        "gender": row["gender"],
        "master_category": row["masterCategory"],
        "sub_category": row["subCategory"],
        "article_type": row["articleType"],
        "base_colour": row["baseColour"],
        "season": row["season"],
        "usage": row["usage"],
        "year": int(year) if year else None,
        "image_path": f"{row['id']}.jpg",
        "image_vector": vector,
    }
    return {k: v for k, v in doc.items() if v not in (None, "")}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="index only the first N products")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--solr-url", default=os.getenv("SOLR_URL", "http://localhost:8983/solr/products"))
    parser.add_argument("--images-dir", type=Path, default=REPO_ROOT / "data" / "images")
    args = parser.parse_args()

    args.images_dir.mkdir(parents=True, exist_ok=True)
    solr = httpx.Client(base_url=args.solr_url, timeout=60)
    ensure_schema(solr)

    dataset = load_dataset(DATASET, split="train")
    if args.limit:
        dataset = dataset.select(range(min(args.limit, len(dataset))))
    rows = (r for r in dataset if r.get("productDisplayName") and r.get("image") is not None)

    clip = ClipEmbedder()
    print(f"Embedding {len(dataset)} products on {clip.device}")

    indexed = 0
    with tqdm(total=len(dataset), unit="img") as progress:
        for batch in batched(rows, args.batch_size):
            for row in batch:
                path = args.images_dir / f"{row['id']}.jpg"
                if not path.exists():
                    row["image"].convert("RGB").save(path, quality=90)
            vectors = clip.embed_images([row["image"] for row in batch])
            docs = [to_doc(row, vec) for row, vec in zip(batch, vectors)]
            solr.post("/update", params={"commitWithin": 10000}, json=docs).raise_for_status()
            indexed += len(docs)
            progress.update(len(batch))

    solr.get("/update", params={"commit": "true"}).raise_for_status()
    print(f"Indexed {indexed} products into {args.solr_url}")
