"""Tool: Curate a weekly AI reading list across all learning pillars."""

from datetime import date


# High-quality source registry — the LLM uses these as its "approved sources"
# to search and recommend from, ensuring quality bar is maintained.
CURATED_SOURCES = {
    "ai_frontier": {
        "research": [
            "arXiv (cs.AI, cs.CL, cs.LG)",
            "Google DeepMind blog",
            "Anthropic research blog",
            "OpenAI research blog",
            "Meta AI (FAIR) blog",
        ],
        "practitioner": [
            "Simon Willison's Weblog (simonwillison.net)",
            "Chip Huyen's blog (huyenchip.com)",
            "Lilian Weng's blog (lilianweng.github.io)",
            "Eugene Yan's blog (eugeneyan.com)",
            "Hamel Husain's blog (hamel.dev)",
            "Hugging Face blog",
            "LangChain blog",
            "LlamaIndex blog",
        ],
        "newsletters": [
            "The Batch by Andrew Ng (deeplearning.ai)",
            "Import AI by Jack Clark",
            "The Gradient",
            "TLDR AI",
            "Ahead of AI by Sebastian Raschka",
        ],
    },
    "agentic_ai": [
        "arXiv papers on AI agents and tool use",
        "LangGraph / LangChain agent documentation",
        "Google ADK documentation (adk.dev)",
        "Anthropic's agent patterns blog posts",
        "CrewAI documentation and blog",
        "AutoGen (Microsoft) documentation",
    ],
    "business": [
        "Harvard Business Review (hbr.org)",
        "Stratechery by Ben Thompson",
        "Lenny's Newsletter (lennysnewsletter.com)",
        "First Round Review (firstround.com)",
        "a16z blog (a16z.com)",
        "Sequoia Arc",
        "Reforge blog",
        "MIT Sloan Management Review",
        "McKinsey Quarterly",
        "Bain Insights",
        "Not Boring by Packy McCormick",
    ],
    "applied_ai": [
        "a16z AI playbooks",
        "Google Cloud AI case studies",
        "AWS AI/ML case studies",
        "TechCrunch AI section",
        "The Information (AI coverage)",
        "VentureBeat AI section",
    ],
}


# ── Domain allowlist ─────────────────────────────────────────────────────
# Maps every approved source to its real domain(s).
# This is the SINGLE SOURCE OF TRUTH for which websites are allowed.
APPROVED_DOMAINS = {
    # AI Frontier — research
    "arxiv.org":                "arXiv",
    "deepmind.google":          "Google DeepMind blog",
    "anthropic.com":            "Anthropic research blog",
    "openai.com":               "OpenAI research blog",
    "ai.meta.com":              "Meta AI (FAIR) blog",
    # AI Frontier — practitioner
    "simonwillison.net":        "Simon Willison's Weblog",
    "huyenchip.com":            "Chip Huyen's blog",
    "lilianweng.github.io":     "Lilian Weng's blog",
    "karpathy.ai":              "Andrej Karpathy's blog",
    "karpathy.github.io":       "Andrej Karpathy's blog",
    "eugeneyan.com":            "Eugene Yan's blog",
    "hamel.dev":                "Hamel Husain's blog",
    "huggingface.co":           "Hugging Face blog",
    "blog.langchain.dev":       "LangChain blog",
    "blog.langchain.com":       "LangChain blog",
    "langchain.com":            "LangChain blog",
    "llamaindex.ai":            "LlamaIndex blog",
    # AI Frontier — newsletters
    "deeplearning.ai":          "The Batch by Andrew Ng",
    "importai.net":             "Import AI by Jack Clark",
    "thegradient.pub":          "The Gradient",
    "tldr.tech":                "TLDR AI",
    "magazine.sebastianraschka.com": "Ahead of AI by Sebastian Raschka",
    # Agentic AI
    "adk.dev":                  "Google ADK documentation",
    "crewai.com":               "CrewAI",
    "microsoft.github.io":      "AutoGen (Microsoft)",
    # Business
    "hbr.org":                  "Harvard Business Review",
    "hbs.edu":                  "Harvard Business School",
    "stratechery.com":          "Stratechery",
    "lennysnewsletter.com":     "Lenny's Newsletter",
    "lenny.substack.com":       "Lenny's Newsletter",
    "firstround.com":           "First Round Review",
    "review.firstround.com":    "First Round Review",
    "a16z.com":                 "a16z blog",
    "sequoiacap.com":           "Sequoia Arc",
    "reforge.com":              "Reforge blog",
    "sloanreview.mit.edu":      "MIT Sloan Management Review",
    "mitsloan.mit.edu":         "MIT Sloan",
    "mckinsey.com":             "McKinsey Quarterly",
    "bain.com":                 "Bain Insights",
    "notboring.co":             "Not Boring by Packy McCormick",
    "packymccormick.substack.com": "Not Boring by Packy McCormick",
    # Applied AI
    "cloud.google.com":         "Google Cloud AI",
    "aws.amazon.com":           "AWS AI/ML",
    "techcrunch.com":           "TechCrunch",
    "theinformation.com":       "The Information",
    "venturebeat.com":          "VentureBeat",
}

# Flat set of approved domain roots for fast matching (e.g. "hbr" from "hbr.org")
APPROVED_DOMAIN_ROOTS = {d.split(".")[0] for d in APPROVED_DOMAINS}

# Google Search site: filter — used in the API server prompt
SITE_FILTER = " OR ".join(f"site:{domain}" for domain in APPROVED_DOMAINS)




def curate_reading_list(
    focus_area: str = "all",
    week_of: str = "",
) -> dict:
    """Curate a weekly reading list of high-quality AI, agentic AI, and business articles.

    This tool provides the agent with a curated registry of approved high-quality
    sources organized by learning pillar. The agent should use these sources
    combined with Google Search to find the most relevant and recent articles
    for the specified focus area and week.

    Args:
        focus_area: Which learning pillar to focus on.
            Options: "ai_frontier", "agentic_ai", "business", "applied_ai", "all".
            Use "all" for a balanced mix across all pillars.
        week_of: The week to curate for, in ISO format (e.g. "2026-08-18").
            Leave empty for the current week.

    Returns:
        A dictionary containing the curated source registry, formatting
        guidelines, and the target week — which the agent uses to produce
        a structured reading list of 5-7 articles.
    """
    target_week = week_of if week_of else date.today().isoformat()

    if focus_area == "all":
        sources = CURATED_SOURCES
    elif focus_area in CURATED_SOURCES:
        sources = {focus_area: CURATED_SOURCES[focus_area]}
    else:
        sources = CURATED_SOURCES  # fallback to all

    return {
        "task": "curate_weekly_reading_list",
        "target_week": target_week,
        "focus_area": focus_area,
        "approved_sources": sources,
        "approved_domains": list(APPROVED_DOMAINS.keys()),
        "site_filter": SITE_FILTER,
        "instructions": (
            "Using ONLY the approved sources above and Google Search, find at least 6-10 "
            "must-read articles/papers across the listed subjects.\n"
            "CRITICAL CONDITIONS:\n"
            "1. NO recommendation is older than 12 months.\n"
            "2. MUST include at least 1 article from EACH pillar (AI Frontier, Agentic AI, Business, Applied AI).\n"
            "3. MUST include at least 2 articles specifically for the 'Business' pillar.\n"
            "4. ONLY recommend articles from the APPROVED DOMAINS listed below. "
            "Do NOT recommend articles from any other website.\n"
            "For EACH item, provide: title, author, source, publication date, a 2-sentence "
            "'why read this' rationale specific to a Principal PM, estimated "
            "read time, and difficulty level (🟢/🟡/🔴). "
            "Organize by pillar. Prioritize Tier 1 and Tier 2 sources. "
            "NO listicles, NO clickbait, NO surface-level overviews."
        ),
        "output_format": {
            "per_article": [
                "title",
                "author",
                "source_and_url",
                "published_date",
                "why_read_this (2 sentences, PM-specific)",
                "estimated_read_time",
                "difficulty (🟢 Beginner | 🟡 Intermediate | 🔴 Advanced)",
                "pillar (AI Frontier | Agentic AI | Business | Applied AI)",
            ],
            "total_articles": "6-10",
            "total_estimated_time": "sum of all read times",
        },
    }

