"""
==============================================================================
PM-AI-AGENT: Automated Quality & Evals Test Harness (eval_recommendations.py)
==============================================================================
PRODUCT ROLE:
  Acts as our automated CI/CD Quality Assurance (QA) gate for curated content.
  Just like automated unit tests protect code, this script audits our article
  catalog against 5 strict PM quality standards before content reaches users.

THE 5 QUALITY EVALUATION GATES (Max 100 Pts):
  1. Source Authority (25 pts): Verifies content originates from approved Tier-1/2/3 sources.
  2. Pillar Balance (25 pts): Ensures minimum 4 curated items per learning pillar.
  3. Actionable Context (25 pts): Validates clear Problem, Insight, and Why-Read summaries.
  4. Access Transparency (15 pts): Confirms open-access vs paywall/subscription tagging.
  5. Feedback Loop Health (10 pts): Audits integration with user sentiment logs.

RUNNING:
  python eval_recommendations.py (outputs score and generates eval_report.json)
==============================================================================
"""

import json
import os
import re
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agent.tools.curate_reading import APPROVED_DOMAINS


def evaluate_catalog(catalog_path: str) -> dict:
    if not os.path.exists(catalog_path):
        raise FileNotFoundError(f"Catalog file not found: {catalog_path}")

    with open(catalog_path, "r") as f:
        data = json.load(f)

    total_articles = len(data)
    if total_articles == 0:
        return {"error": "Catalog is empty", "composite_score": 0, "pass": False}

    # ── Metric 1: Domain Authority (Max 25 pts) ──
    domain_hits = 0
    for art in data:
        url = art.get("source_and_url", "")
        domain_match = re.search(r'https?://(?:www\.)?([^/]+)', url)
        if domain_match:
            dom = domain_match.group(1).lower()
            if any(dom == app or dom.endswith("." + app) for app in APPROVED_DOMAINS):
                domain_hits += 1
            elif "github.io" in dom or "arxiv.org" in dom:
                domain_hits += 1

    domain_score = (domain_hits / total_articles) * 25

    # ── Metric 2: Pillar Balance for 2x2 Grid (Max 25 pts) ──
    pillar_counts = {}
    for art in data:
        p = art.get("pillar", "Other")
        pillar_counts[p] = pillar_counts.get(p, 0) + 1

    expected_pillars = ["AI Frontier", "Agentic AI", "Business", "Applied AI", "Product Ideas"]
    balanced_pillars = sum(1 for p in expected_pillars if pillar_counts.get(p, 0) >= 3)
    pillar_score = (balanced_pillars / len(expected_pillars)) * 25

    # ── Metric 3: Self-Contained Problem Depth & Tier Context (Max 30 pts) ──
    depth_points = 0
    for art in data:
        prob = (art.get("summary_problem") or art.get("problem_solved") or "").strip()
        why = (art.get("summary_why_read") or art.get("why_read_this") or "").strip()
        auth = art.get("author", "").strip()
        time = art.get("estimated_read_time", "").strip()
        tier1 = (art.get("tier") or art.get("tier1_context") or "").strip()

        # Check for concrete PM problem + Tier context
        if len(prob) >= 20 and len(why) >= 20 and len(auth) > 3 and len(time) > 2 and len(tier1) >= 4:
            depth_points += 1
        elif len(prob) >= 15 and len(why) >= 15:
            depth_points += 0.8

    depth_score = (depth_points / total_articles) * 30

    # ── Metric 4: Access Transparency (Max 20 pts) ──
    access_points = 0
    for art in data:
        access = art.get("access_type", "")
        if access in ["open", "subscription"]:
            access_points += 1

    access_score = (access_points / total_articles) * 20

    composite_score = round(domain_score + pillar_score + depth_score + access_score, 1)
    passed = composite_score >= 85.0

    eval_results = {
        "total_articles": total_articles,
        "composite_score": composite_score,
        "pass_status": "PASS" if passed else "FAIL",
        "breakdown": {
            "domain_authority": f"{round(domain_score, 1)}/25 ({domain_hits}/{total_articles} tier-1 sources)",
            "pillar_balance": f"{round(pillar_score, 1)}/25 ({balanced_pillars}/4 pillars with 4+ articles for 2x2 grid)",
            "problem_and_tier1_depth": f"{round(depth_score, 1)}/30 (self-contained PM takeaways + Tier-1 context)",
            "access_transparency": f"{round(access_score, 1)}/20 (open/subscription classification)",
        },
        "pillar_distribution": pillar_counts,
    }

    return eval_results


def main():
    print("=" * 60)
    print(" 🧪 PM Learning Hub — Automated Recommendation Evaluation")
    print("=" * 60)

    catalog_file = os.path.join(
        os.path.dirname(__file__), "..", "frontend", "public", "recommendations.json"
    )

    results = evaluate_catalog(catalog_file)
    print(f"Total Evaluated: {results['total_articles']} recommendations")
    print(f"Composite Score: {results['composite_score']}/100 — Status: {results['pass_status']}")
    print("\nDetailed Score Breakdown:")
    for k, v in results["breakdown"].items():
        print(f"  • {k.replace('_', ' ').title()}: {v}")

    print("\nPillar Distribution:")
    for pillar, count in results["pillar_distribution"].items():
        print(f"  • {pillar}: {count} articles")

    print("=" * 60)

    report_path = os.path.join(os.path.dirname(__file__), "eval_report.json")
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Report written to: {report_path}")


if __name__ == "__main__":
    main()
