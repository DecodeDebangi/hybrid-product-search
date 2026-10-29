"""Offline relevance evaluation: run the labelled query set against the live API and score each ranking mode."""

import argparse
import csv
import json
import math
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

import httpx

from .paths import REPO_ROOT

MODES = ["lexical", "vector", "hybrid"]
CATEGORIES = ["keyword", "synonym", "descriptive", "attribute"]
K = 10
DEPTH = 50  # results fetched per query; MRR looks this deep
SPOT_CHECK_DEPTH = 5
TIE_MARGIN = 0.01
ATTRIBUTES = ["article_type", "sub_category", "base_colour", "gender", "usage", "season"]


def satisfies(doc: dict, rules: dict[str, list[str]]) -> bool:
    return all(doc.get(field) in values for field, values in rules.items())


def grade(doc: dict, query: dict) -> int:
    if not satisfies(doc, query["must"]):
        return 0
    return 2 if satisfies(doc, query.get("should", {})) else 1


def dcg(grades: list[int]) -> float:
    return sum((2**g - 1) / math.log2(i + 2) for i, g in enumerate(grades[:K]))


def score(grades: list[int], n_relevant: int, n_perfect: int) -> dict[str, float]:
    ideal = [2] * min(n_perfect, K) + [1] * min(n_relevant - n_perfect, K)
    first_hit = next((i for i, g in enumerate(grades) if g > 0), None)
    return {
        "ndcg": dcg(grades) / dcg(sorted(ideal, reverse=True)),
        "precision": sum(g > 0 for g in grades[:K]) / K,
        "mrr": 1 / (first_hit + 1) if first_hit is not None else 0.0,
    }


class Solr:
    def __init__(self, url: str):
        self.client = httpx.Client(base_url=url, timeout=30)

    def count(self, *rule_sets: dict[str, list[str]]) -> int:
        filters = [f"{{!terms f={field}}}{','.join(values)}" for rules in rule_sets for field, values in rules.items()]
        res = self.client.post("/select", json={"query": "*:*", "filter": filters, "limit": 0})
        res.raise_for_status()
        return res.json()["response"]["numFound"]

    def attributes(self, ids: list[str]) -> dict[str, dict]:
        if not ids:
            return {}
        res = self.client.get("/get", params={"ids": ",".join(ids), "fl": ",".join(["id", "name", *ATTRIBUTES])})
        res.raise_for_status()
        return {doc["id"]: doc for doc in res.json()["response"]["docs"]}


def search(api: httpx.Client, query: str, mode: str, fusion: dict[str, str], extra: dict[str, str]) -> list[str]:
    params = {"q": query, "mode": mode, "limit": DEPTH, **extra, **(fusion if mode == "hybrid" else {})}
    res = api.get("/api/search", params=params)
    res.raise_for_status()
    return [hit["id"] for hit in res.json()["hits"]]


def git_sha() -> str:
    try:
        out = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO_ROOT, capture_output=True, text=True)
        return out.stdout.strip() or "unknown"
    except OSError:
        return "unknown"


def evaluate(
    queries: list[dict], api: httpx.Client, solr: Solr, fusion: dict[str, str], extra: dict[str, str]
) -> tuple[list[dict], list[dict]]:
    rows, spot_checks = [], []
    for q in queries:
        n_relevant = solr.count(q["must"])
        n_perfect = solr.count(q["must"], q.get("should", {}))
        if n_relevant == 0:
            raise ValueError(f"{q['id']}: no product in the catalog satisfies its `must` rules")

        row = {"id": q["id"], "category": q["category"], "query": q["query"], "relevant_in_catalog": n_relevant}
        for mode in MODES:
            ids = search(api, q["query"], mode, fusion, extra)
            docs = solr.attributes(ids)
            grades = [grade(docs.get(i, {}), q) for i in ids]
            row[mode] = score(grades, n_relevant, n_perfect)
            for rank, (doc_id, g) in enumerate(zip(ids[:SPOT_CHECK_DEPTH], grades), start=1):
                doc = docs.get(doc_id, {})
                spot_checks.append(
                    {
                        "query_id": q["id"],
                        "query": q["query"],
                        "mode": mode,
                        "rank": rank,
                        "product_id": doc_id,
                        "name": doc.get("name", ""),
                        **{a: doc.get(a, "") for a in ATTRIBUTES},
                        "auto_grade": g,
                        "human_grade": "",
                    }
                )
        rows.append(row)
        print(f"{q['id']:5} " + "  ".join(f"{m} {row[m]['ndcg']:.2f}" for m in MODES) + f"  {q['query']}")
    return rows, spot_checks


def summarize(rows: list[dict]) -> dict:
    groups = {c: [r for r in rows if r["category"] == c] for c in CATEGORIES} | {"all": rows}
    means = {
        group: {mode: {m: mean(r[mode][m] for r in members) for m in ["ndcg", "precision", "mrr"]} for mode in MODES}
        for group, members in groups.items()
        if members
    }

    def head_to_head(a: str, b: str) -> dict[str, int]:
        diffs = [r[a]["ndcg"] - r[b]["ndcg"] for r in rows]
        return {
            "wins": sum(d > TIE_MARGIN for d in diffs),
            "ties": sum(abs(d) <= TIE_MARGIN for d in diffs),
            "losses": sum(d < -TIE_MARGIN for d in diffs),
        }

    return {
        "means": means,
        "hybrid_vs_lexical": head_to_head("hybrid", "lexical"),
        "hybrid_vs_vector": head_to_head("hybrid", "vector"),
    }


def render_markdown(summary: dict, rows: list[dict], meta: dict) -> str:
    means = summary["means"]
    lines = [
        "# Relevance evaluation",
        "",
        f"Run {meta['timestamp']} on commit `{meta['commit']}`. "
        f"{meta['queries']} queries from `{meta['query_set']}`, hybrid fusion `{meta['fusion']}`, "
        f"extra parameters `{meta['params'] or 'none'}`, "
        f"metrics at k={K} (MRR within the top {DEPTH}).",
        "",
        "## nDCG@10 by query type",
        "",
        "| Query type | n | Lexical | Vector | Hybrid |",
        "| --- | --- | --- | --- | --- |",
    ]
    for group in [*CATEGORIES, "all"]:
        if group not in means:
            continue
        n = len(rows) if group == "all" else sum(r["category"] == group for r in rows)
        best = max(MODES, key=lambda m: means[group][m]["ndcg"])
        cells = [
            f"**{means[group][m]['ndcg']:.3f}**" if m == best else f"{means[group][m]['ndcg']:.3f}" for m in MODES
        ]
        label = "**All**" if group == "all" else group.capitalize()
        lines.append(f"| {label} | {n} | " + " | ".join(cells) + " |")

    lines += [
        "",
        "## All metrics, all queries",
        "",
        "| Mode | nDCG@10 | Precision@10 | MRR |",
        "| --- | --- | --- | --- |",
        *(
            f"| {m.capitalize()} | {means['all'][m]['ndcg']:.3f} | {means['all'][m]['precision']:.3f} | "
            f"{means['all'][m]['mrr']:.3f} |"
            for m in MODES
        ),
        "",
        f"## Head to head (nDCG@10, ties within ±{TIE_MARGIN})",
        "",
        "| Comparison | Wins | Ties | Losses |",
        "| --- | --- | --- | --- |",
    ]
    for key, label in [("hybrid_vs_lexical", "Hybrid vs Lexical"), ("hybrid_vs_vector", "Hybrid vs Vector")]:
        h = summary[key]
        lines.append(f"| {label} | {h['wins']} | {h['ties']} | {h['losses']} |")

    lines += [
        "",
        "## Per query (nDCG@10)",
        "",
        "| ID | Query | Relevant in catalog | Lexical | Vector | Hybrid |",
        "| --- | --- | --- | --- | --- | --- |",
        *(
            f"| {r['id']} | {r['query']} | {r['relevant_in_catalog']:,} | "
            + " | ".join(f"{r[m]['ndcg']:.2f}" for m in MODES)
            + " |"
            for r in rows
        ),
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", default=os.getenv("API_URL", "http://localhost:4000"))
    parser.add_argument("--solr-url", default=os.getenv("SOLR_URL", "http://localhost:8983/solr/products"))
    parser.add_argument("--queries", type=Path, default=REPO_ROOT / "eval" / "queries.json")
    parser.add_argument("--out-dir", type=Path, default=REPO_ROOT / "eval" / "results")
    parser.add_argument("--fusion", choices=["rrf", "weighted", "verified"], help="hybrid fusion strategy")
    parser.add_argument("--lexical-weight", help="BM25 weight for --fusion weighted")
    parser.add_argument(
        "--param", action="append", default=[], metavar="KEY=VALUE", help="extra search parameter for every mode"
    )
    args = parser.parse_args()

    queries = json.loads(args.queries.read_text())["queries"]
    api = httpx.Client(base_url=args.api_url, timeout=60)
    fusion = {k: v for k, v in {"fusion": args.fusion, "lexicalWeight": args.lexical_weight}.items() if v}
    extra = dict(p.split("=", 1) for p in args.param)
    rows, spot_checks = evaluate(queries, api, Solr(args.solr_url), fusion, extra)
    summary = summarize(rows)
    meta = {
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "commit": git_sha(),
        "queries": len(rows),
        "query_set": args.queries.name,
        "fusion": fusion or {"fusion": "rrf"},
        "params": extra,
    }

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "latest.json").write_text(json.dumps({"meta": meta, "summary": summary, "queries": rows}, indent=2))
    (args.out_dir / "latest.md").write_text(render_markdown(summary, rows, meta))
    with open(args.out_dir / "spot_check.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(spot_checks[0]))
        writer.writeheader()
        writer.writerows(spot_checks)

    print()
    for group, by_mode in summary["means"].items():
        print(f"{group:12} " + "  ".join(f"{m} {by_mode[m]['ndcg']:.3f}" for m in MODES))
    print(f"\nWrote {args.out_dir / 'latest.md'}")
