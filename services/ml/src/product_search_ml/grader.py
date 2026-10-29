"""Blind human grading of a sample of eval results, and agreement with the automatic grades."""

import argparse
import csv
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .paths import REPO_ROOT

RESULTS_DIR = REPO_ROOT / "eval" / "results"
SPOT_CHECK = RESULTS_DIR / "spot_check.csv"
GRADES_FILE = RESULTS_DIR / "human_grades.json"
REPORT_FILE = RESULTS_DIR / "human_agreement.md"
IMAGES_DIR = REPO_ROOT / "data" / "images"
CATEGORIES = {"kw": "keyword", "sy": "synonym", "de": "descriptive"}


def build_sample(size: int, seed: int) -> list[dict]:
    """Balanced across query types, spread across queries, each (query, product) pair at most once."""
    pairs: dict[tuple[str, str], dict] = {}
    with open(SPOT_CHECK) as f:
        for row in csv.DictReader(f):
            pairs.setdefault((row["query_id"], row["product_id"]), row)

    by_category: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    for (query_id, _), row in pairs.items():
        by_category[query_id[:2]][query_id].append(row)

    rng = random.Random(seed)
    quotas = {prefix: size // len(CATEGORIES) for prefix in CATEGORIES}
    for prefix in list(CATEGORIES)[: size % len(CATEGORIES)]:
        quotas[prefix] += 1

    sample = []
    for prefix, quota in quotas.items():
        queries = by_category[prefix]
        for rows in queries.values():
            rng.shuffle(rows)
        order = sorted(queries)
        rng.shuffle(order)
        picked = 0
        while picked < quota and any(queries.values()):
            for query_id in order:
                if picked == quota:
                    break
                if queries[query_id]:
                    sample.append(queries[query_id].pop())
                    picked += 1

    rng.shuffle(sample)
    return [
        {
            "key": f"{row['query_id']}:{row['product_id']}",
            "query_id": row["query_id"],
            "query": row["query"],
            "product_id": row["product_id"],
            "name": row["name"],
            "auto_grade": int(row["auto_grade"]),
            "human_grade": None,
        }
        for row in sample
    ]


def load_or_create(size: int, seed: int) -> dict:
    if GRADES_FILE.exists():
        return json.loads(GRADES_FILE.read_text())
    state = {"seed": seed, "items": build_sample(size, seed)}
    GRADES_FILE.write_text(json.dumps(state, indent=2))
    return state


class Grade(BaseModel):
    key: str
    grade: int | None = Field(ge=0, le=2)


def create_app(state: dict, only: set[str] | None = None) -> FastAPI:
    app = FastAPI(title="product-search-grader")
    items = {item["key"]: item for item in state["items"]}
    shown = [item for item in state["items"] if only is None or item["key"] in only]

    @app.get("/", response_class=HTMLResponse)
    def page():
        return (Path(__file__).parent / "grader.html").read_text()

    @app.get("/items")
    def list_items():
        # Blind: the automatic grade never reaches the browser.
        return [{k: v for k, v in item.items() if k != "auto_grade"} for item in shown]

    @app.post("/grade")
    def save(grade: Grade):
        if grade.key not in items:
            raise HTTPException(status_code=404, detail="Unknown item")
        items[grade.key]["human_grade"] = grade.grade
        GRADES_FILE.write_text(json.dumps(state, indent=2))
        return {"graded": sum(i["human_grade"] is not None for i in state["items"]), "total": len(items)}

    app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")
    return app


def cohens_kappa(a: list[int], b: list[int]) -> float:
    n = len(a)
    observed = sum(x == y for x, y in zip(a, b)) / n
    ca, cb = Counter(a), Counter(b)
    expected = sum(ca[k] * cb[k] for k in set(a) | set(b)) / (n * n)
    return 1.0 if expected == 1 else (observed - expected) / (1 - expected)


def report() -> None:
    state = json.loads(GRADES_FILE.read_text())
    graded = [i for i in state["items"] if i["human_grade"] is not None]
    if not graded:
        raise SystemExit("No human grades yet. Run `pnpm grade` first.")

    auto = [i["auto_grade"] for i in graded]
    human = [i["human_grade"] for i in graded]
    exact = sum(a == h for a, h in zip(auto, human)) / len(graded)
    binary_auto = [int(a > 0) for a in auto]
    binary_human = [int(h > 0) for h in human]
    binary = sum(a == h for a, h in zip(binary_auto, binary_human)) / len(graded)

    lines = [
        "# Human vs automatic grades",
        "",
        f"{len(graded)} of {len(state['items'])} sampled (query, product) pairs graded blind (seed {state['seed']}).",
        "",
        "| Measure | Value |",
        "| --- | --- |",
        f"| Relevant vs not relevant, agreement | {binary:.0%} |",
        f"| Relevant vs not relevant, Cohen's κ | {cohens_kappa(binary_auto, binary_human):.2f} |",
        f"| Exact grade (0/1/2) agreement | {exact:.0%} |",
        f"| Exact grade, Cohen's κ | {cohens_kappa(auto, human):.2f} |",
        "",
        "## By query type",
        "",
        "| Query type | n | Relevant vs not agreement |",
        "| --- | --- | --- |",
    ]
    for prefix, label in CATEGORIES.items():
        group = [i for i in graded if i["query_id"].startswith(prefix)]
        if group:
            agree = sum((i["auto_grade"] > 0) == (i["human_grade"] > 0) for i in group) / len(group)
            lines.append(f"| {label.capitalize()} | {len(group)} | {agree:.0%} |")

    disagreements = sorted((i for i in graded if i["auto_grade"] != i["human_grade"]), key=lambda i: i["query_id"])
    lines += ["", "## Disagreements", ""]
    if disagreements:
        lines += ["| Query | Product | Auto | Human |", "| --- | --- | --- | --- |"]
        lines += [
            f"| {i['query_id']} {i['query']} | {i['name']} ({i['product_id']}) | {i['auto_grade']} | {i['human_grade']} |"
            for i in disagreements
        ]
    else:
        lines.append("None.")

    REPORT_FILE.write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:11]))
    print(f"\nWrote {REPORT_FILE}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", action="store_true", help="compute agreement from saved grades")
    parser.add_argument("--size", type=int, default=50)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--port", type=int, default=8002)
    parser.add_argument("--only", help="comma-separated item keys to re-grade, e.g. de09:24384,sy10:30228")
    args = parser.parse_args()

    if args.report:
        report()
        return
    state = load_or_create(args.size, args.seed)
    only = set(args.only.split(",")) if args.only else None
    unknown = (only or set()) - {item["key"] for item in state["items"]}
    if unknown:
        raise SystemExit(f"Unknown item keys: {', '.join(sorted(unknown))}")
    count = len(only) if only else len(state["items"])
    print(f"Grading {count} items at http://localhost:{args.port}  (saves to {GRADES_FILE})")
    uvicorn.run(create_app(state, only), host="127.0.0.1", port=args.port, log_level="warning")
