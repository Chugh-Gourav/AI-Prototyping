"""
Tool: Curate a weekly AI reading list across the 4 streamlined learning pillars:
1. AI Deep Dive & Application
2. Business & Economics
3. Core Product Management
4. Product Ideas to try
"""

from datetime import date

# High-quality source registry — grounded in real, battle-tested practitioner sources
CURATED_SOURCES = {
    "ai_deep_dive": {
        "research_labs": [
            "Anthropic Research & Engineering (anthropic.com)",
            "Google DeepMind (deepmind.google)",
            "OpenAI Research (openai.com)",
            "Hugging Face (huggingface.co)",
        ],
        "engineering_blogs": [
            "DoorDash Engineering (careersatdoordash.com/blog)",
            "Uber Engineering (uber.com/blog)",
            "Stripe Engineering (stripe.com)",
        ],
        "practitioners": [
            "Sebastian Raschka (Ahead of AI)",
            "Eugene Yan (eugeneyan.com)",
            "Lilian Weng (lilianweng.github.io)",
            "Google PAIR (pair.withgoogle.com)",
        ],
    },
    "business_economics": [
        "a16z (a16z.com, a16z.news)",
        "McKinsey & Company (mckinsey.com)",
        "Harvard Business Review (hbr.org)",
        "Stratechery by Ben Thompson (stratechery.com)",
    ],
    "core_pm": [
        "Lenny's Newsletter (lennysnewsletter.com)",
        "Shreyas Doshi (shreyasdoshi.substack.com)",
    ],
    "product_ideas": [
        "Actionable AI product concepts, UI/UX interaction design patterns, and workflow exploration prototypes for PMs to try (e.g., Google PAIR, Anthropic Computer Use, Eugene Yan LLM Patterns)",
    ],
}

# Domain allowlist — SINGLE SOURCE OF TRUTH for approved sources
APPROVED_DOMAINS = {
    # AI Deep Dive & Application
    "anthropic.com": "Anthropic Research & Engineering",
    "deepmind.google": "Google DeepMind",
    "huggingface.co": "Hugging Face",
    "applied-llms.org": "Applied LLMs",
    "careersatdoordash.com": "DoorDash Engineering",
    "doordash.engineering": "DoorDash Engineering",
    "uber.com": "Uber Engineering",
    "stripe.com": "Stripe Engineering",
    "magazine.sebastianraschka.com": "Ahead of AI by Sebastian Raschka",
    "eugeneyan.com": "Eugene Yan",
    "lilianweng.github.io": "Lilian Weng",
    "pair.withgoogle.com": "Google PAIR",
    "simonwillison.net": "Simon Willison",
    # Business & Economics
    "a16z.com": "a16z",
    "a16z.news": "a16z News",
    "mckinsey.com": "McKinsey & Company",
    "hbr.org": "Harvard Business Review",
    "stratechery.com": "Stratechery",
    # Core Product Management
    "lennysnewsletter.com": "Lenny's Newsletter",
    "shreyasdoshi.substack.com": "Shreyas Doshi",
}

APPROVED_DOMAIN_ROOTS = {d.split(".")[0] for d in APPROVED_DOMAINS}
SITE_FILTER = " OR ".join(f"site:{domain}" for domain in APPROVED_DOMAINS)


def curate_reading_list(
    focus_area: str = "all",
    week_of: str = "",
) -> dict:
    """Curate a weekly reading list of high-quality articles across the 4 PM pillars.

    Args:
        focus_area: Which learning pillar to focus on.
            Options: "ai_deep_dive", "business_economics", "core_pm", "product_ideas", "all".
        week_of: The week to curate for in ISO format (e.g. "2026-09-25").

    Returns:
        A dictionary containing the approved source registry and formatting guidelines.
    """
    target_week = week_of if week_of else date.today().isoformat()

    if focus_area == "all":
        sources = CURATED_SOURCES
    elif focus_area in CURATED_SOURCES:
        sources = {focus_area: CURATED_SOURCES[focus_area]}
    else:
        sources = CURATED_SOURCES

    return {
        "task": "curate_weekly_reading_list",
        "target_week": target_week,
        "focus_area": focus_area,
        "approved_sources": sources,
        "approved_domains": list(APPROVED_DOMAINS.keys()),
        "site_filter": SITE_FILTER,
        "instructions": (
            "Using ONLY the approved sources above and Google Search Grounding, find 4-8 "
            "must-read practitioner articles across the 4 learning pillars:\n"
            "1. AI Deep Dive & Application\n"
            "2. Business & Economics\n"
            "3. Core Product Management\n"
            "4. Product Ideas to try (practical product concepts, UX design patterns, and prototyping experiments — NOT PRDs)\n\n"
            "CRITICAL CONDITIONS:\n"
            "1. NO generic homepages. EVERY URL MUST BE A DIRECT DEEP LINK THAT RETURNS HTTP 200.\n"
            "2. Genuine publication date (2025/2026 or flagged as timeless classic).\n"
            "3. ONLY recommend from APPROVED DOMAINS.\n"
            "4. MANDATORY META-THINKING: Connect the dots across technical mechanics, unit economics, and practical product strategy in 2-3 explanatory sentences without parenthetical tags like '(Architecture)' or '(Economics)'.\n"
            "For EACH item, provide the structured PM Lens: outcome_learning, meta_synthesis, "
            "summary_problem, summary_insight, summary_why_read, and 3 quantitative key takeaways."
        ),
        "output_format": {
            "per_article": [
                "id",
                "title",
                "author",
                "source_and_url",
                "published_date",
                "pillar (AI Deep Dive & Application | Business & Economics | Core Product Management | Product Ideas to try)",
                "tier (Tier 1 | Tier 2 | Tier 3)",
                "difficulty (🟢 Beginner | 🟡 Intermediate | 🔴 Advanced)",
                "access_type",
                "estimated_read_time",
                "outcome_learning",
                "meta_synthesis (Connecting the dots in natural explanatory prose without parentheticals)",
                "summary_problem",
                "summary_insight",
                "summary_why_read",
                "key_takeaways"
            ]
        },
    }
