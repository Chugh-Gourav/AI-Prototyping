"""Tool: Business deep dive — analysis, unit economics, and article recommendations."""


# Business frameworks and article source registry
BUSINESS_FRAMEWORKS = {
    "unit_economics": {
        "name": "Unit Economics Analysis",
        "components": [
            "Customer Acquisition Cost (CAC)",
            "Lifetime Value (LTV)",
            "LTV:CAC ratio (target: >3:1)",
            "Payback period",
            "Gross margin per unit",
            "Contribution margin",
            "Churn rate and retention curves",
        ],
    },
    "competitive_strategy": {
        "name": "Competitive Strategy Frameworks",
        "components": [
            "Porter's Five Forces",
            "Jobs-to-be-Done (JTBD)",
            "Blue Ocean Strategy (value innovation)",
            "Network effects and platform dynamics",
            "Switching costs analysis",
            "Moat taxonomy (brand, network, cost, switching)",
        ],
    },
    "go_to_market": {
        "name": "Go-to-Market Strategy",
        "components": [
            "Product-led growth (PLG) vs sales-led",
            "Freemium conversion funnels",
            "Land-and-expand strategy",
            "Channel strategy and partnerships",
            "Pricing architecture (seat-based, usage-based, outcome-based)",
            "TAM/SAM/SOM sizing",
        ],
    },
    "marketplace_dynamics": {
        "name": "Marketplace Economics",
        "components": [
            "Supply vs demand acquisition",
            "Take rate optimization",
            "Liquidity and density metrics",
            "Chicken-and-egg problem solutions",
            "Disintermediation risk",
            "Multi-tenanting and switching costs",
        ],
    },
    "ai_business_models": {
        "name": "AI-Specific Business Models",
        "components": [
            "AI SaaS pricing (token-based, outcome-based, seat-based)",
            "Model cost structure (inference, training, fine-tuning)",
            "Data moats and flywheel effects",
            "AI feature vs AI product distinction",
            "Commoditization risk and model API dependency",
            "Vertical AI vs horizontal AI positioning",
        ],
    },
}

ARTICLE_SOURCES = {
    "tier_1": [
        {"name": "Harvard Business Review", "url": "hbr.org", "access": "subscription"},
        {"name": "MIT Sloan Management Review", "url": "sloanreview.mit.edu", "access": "subscription"},
        {"name": "Stratechery", "url": "stratechery.com", "access": "subscription", "author": "Ben Thompson"},
    ],
    "tier_2": [
        {"name": "Lenny's Newsletter", "url": "lennysnewsletter.com", "access": "freemium", "author": "Lenny Rachitsky"},
        {"name": "First Round Review", "url": "firstround.com/review", "access": "free"},
        {"name": "a16z blog", "url": "a16z.com/blog", "access": "free"},
        {"name": "Sequoia Arc", "url": "sequoiacap.com/arc", "access": "free"},
        {"name": "Reforge", "url": "reforge.com/blog", "access": "freemium"},
    ],
    "tier_3": [
        {"name": "Not Boring", "url": "notboring.co", "access": "freemium", "author": "Packy McCormick"},
        {"name": "Acquired Podcast", "url": "acquired.fm", "access": "free"},
        {"name": "The Generalist", "url": "generalist.com", "access": "freemium", "author": "Mario Gabriele"},
    ],
}


def business_deep_dive(
    topic: str = "AI SaaS unit economics",
    format: str = "case_study",
) -> dict:
    """Generate HBR-caliber business analysis with unit economics and article recommendations.

    Produces business strategy analysis, unit economics breakdowns, and curated
    article recommendations from top-tier business publications. Designed to
    help a PM compete with elite MBA graduates on business acumen.

    Args:
        topic: The business topic to analyze.
            Examples: "marketplace unit economics", "AI SaaS pricing",
            "travel aggregator CAC/LTV", "vertical AI competitive moats",
            "platform flywheel effects", "outcome-based pricing for AI".
        format: Output format preference.
            Options: "case_study" (full analysis with a real company),
            "framework" (conceptual framework with examples),
            "article_recommendations" (curated reading list only),
            "article_summary" (summarize key insights from recommended articles).

    Returns:
        A dictionary with relevant frameworks, source registry, and
        formatting instructions for the agent to produce MBA-caliber
        business analysis with article recommendations.
    """
    # Find relevant frameworks for the topic
    relevant_frameworks = {}
    topic_lower = topic.lower()
    for key, framework in BUSINESS_FRAMEWORKS.items():
        # Simple keyword matching to select relevant frameworks
        if any(
            kw in topic_lower
            for kw in key.replace("_", " ").split()
        ):
            relevant_frameworks[key] = framework

    # If no specific match, include unit economics and AI business models
    if not relevant_frameworks:
        relevant_frameworks = {
            "unit_economics": BUSINESS_FRAMEWORKS["unit_economics"],
            "ai_business_models": BUSINESS_FRAMEWORKS["ai_business_models"],
        }

    return {
        "task": "business_deep_dive",
        "topic": topic,
        "format": format,
        "relevant_frameworks": relevant_frameworks,
        "all_available_frameworks": list(BUSINESS_FRAMEWORKS.keys()),
        "article_sources": ARTICLE_SOURCES,
        "instructions": (
            f"Generate an HBR-caliber business analysis on '{topic}' "
            f"in '{format}' format. "
            "Include: "
            "1) Executive summary (2-3 sentences), "
            "2) Analysis using the relevant frameworks provided, "
            "3) Quantitative breakdown (unit economics table, key metrics), "
            "4) Real company examples with actual numbers where available, "
            "5) Strategic implications for a PM building AI products, "
            "6) **5-7 recommended articles** with: "
            "   - Title, author, source "
            "   - Why you should read it (1-2 sentence hook) "
            "   - Key takeaway preview "
            "   - Estimated read time "
            "7) Suggested reading order (which to read first for max context). "
            "Use the provided article sources registry to recommend from "
            "high-quality publications. Assume the reader has HBR access. "
            "Make the analysis feel like something a McKinsey consultant "
            "or Stanford GSB professor would produce."
        ),
    }
