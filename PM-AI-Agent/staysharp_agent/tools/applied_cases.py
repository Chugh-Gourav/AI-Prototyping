"""Tool: Generate applied agentic AI case studies for specific verticals."""


# Vertical-specific knowledge base for grounding case studies
VERTICAL_KNOWLEDGE = {
    "ecommerce": {
        "agent_types": [
            "Shopping assistant / personal shopper agent",
            "Dynamic pricing and inventory optimization agent",
            "Customer support agent with order management",
            "Product discovery and recommendation agent",
            "Returns and refund processing agent",
            "Fraud detection and prevention agent",
            "Supplier negotiation and procurement agent",
        ],
        "key_players": [
            "Amazon (Rufus shopping assistant)",
            "Shopify (Sidekick AI assistant)",
            "Klarna (AI customer service agent)",
            "Mercari (AI listing assistant)",
            "eBay (AI-powered search and listings)",
            "Instacart (AI shopping recommendations)",
        ],
        "metrics": [
            "Conversion rate lift",
            "Average order value (AOV)",
            "Customer acquisition cost (CAC)",
            "Cart abandonment reduction",
            "Support ticket deflection rate",
            "Time to resolution",
        ],
    },
    "travel": {
        "agent_types": [
            "Trip planning and itinerary agent",
            "Dynamic pricing and yield management agent",
            "Customer rebooking and disruption agent",
            "Personalized recommendation agent",
            "Multi-supplier booking orchestration agent",
            "Post-trip feedback and loyalty agent",
            "Visa/documentation assistant agent",
        ],
        "key_players": [
            "Google Travel (AI-powered trip planner)",
            "Booking.com (AI trip planner)",
            "Expedia (AI chatbot Romie)",
            "Hopper (price prediction AI)",
            "Kayak (AI travel assistant)",
            "Airbnb (AI host tools)",
        ],
        "metrics": [
            "Booking conversion rate",
            "Revenue per available room (RevPAR)",
            "Customer lifetime value (CLV)",
            "Rebooking automation rate",
            "Net Promoter Score (NPS) impact",
            "Agent cost per resolution vs human",
        ],
    },
    "fintech": {
        "agent_types": [
            "Personal finance advisor agent",
            "Fraud detection and alert agent",
            "Loan underwriting assistant agent",
            "Compliance and regulatory agent",
            "Portfolio rebalancing agent",
            "Customer onboarding (KYC) agent",
        ],
        "key_players": [
            "Stripe (AI-powered fraud detection)",
            "Brex (AI expense management)",
            "Wealthfront (AI financial advisor)",
            "Plaid (AI data enrichment)",
            "Ramp (AI spend intelligence)",
        ],
        "metrics": [
            "False positive rate (fraud)",
            "Loan approval time reduction",
            "Compliance audit pass rate",
            "Customer onboarding time",
            "Cost per transaction",
        ],
    },
    "healthcare": {
        "agent_types": [
            "Clinical documentation agent",
            "Patient triage and symptom checker agent",
            "Drug interaction checker agent",
            "Prior authorization agent",
            "Medical coding and billing agent",
            "Clinical trial matching agent",
        ],
        "key_players": [
            "Google Health (Med-PaLM)",
            "Nuance/Microsoft (DAX Copilot)",
            "Epic (AI documentation)",
            "Tempus (AI clinical insights)",
            "PathAI (AI pathology)",
        ],
        "metrics": [
            "Documentation time saved per encounter",
            "Diagnostic accuracy",
            "Prior auth approval time",
            "Coding accuracy rate",
            "Patient satisfaction score",
        ],
    },
}


def applied_agentic_case(
    vertical: str = "ecommerce",
    focus: str = "architecture",
) -> dict:
    """Generate an applied agentic AI case study for a specific industry vertical.

    Produces detailed case studies showing how AI agents are being deployed
    in real-world industry contexts, including architecture patterns, business
    impact analysis, and a 'build-it-yourself' challenge.

    Args:
        vertical: The industry vertical to analyze.
            Options: "ecommerce", "travel", "fintech", "healthcare", "general".
        focus: What aspect to emphasize in the case study.
            Options: "architecture" (system design and agent patterns),
            "business_case" (ROI, unit economics, competitive dynamics),
            "technical_deep_dive" (implementation details, stack choices).

    Returns:
        A dictionary with vertical-specific knowledge, formatting instructions,
        and guidelines for the agent to produce a structured case study.
    """
    if vertical == "general":
        vertical_info = {
            "note": "Cover cross-industry patterns and emerging use cases",
            "agent_types": ["General-purpose AI assistants", "Workflow automation agents"],
            "key_players": ["Major cloud providers", "AI-native startups"],
            "metrics": ["ROI", "Time saved", "Quality improvement"],
        }
    else:
        vertical_info = VERTICAL_KNOWLEDGE.get(
            vertical, VERTICAL_KNOWLEDGE["ecommerce"]
        )

    return {
        "task": "generate_applied_case_study",
        "vertical": vertical,
        "focus": focus,
        "vertical_knowledge": vertical_info,
        "available_verticals": list(VERTICAL_KNOWLEDGE.keys()) + ["general"],
        "instructions": (
            f"Generate a detailed applied agentic AI case study for the "
            f"'{vertical}' vertical with focus on '{focus}'. "
            "Include: "
            "1) A specific, named use case (not generic), "
            "2) Agent architecture diagram described in text (tools, memory, "
            "   orchestration pattern, external integrations), "
            "3) Tech stack choices with rationale, "
            "4) Business impact (quantified where possible using the "
            "   provided metrics), "
            "5) Key challenges and how they were solved, "
            "6) A 'Build It Yourself' challenge — a scoped version the PM "
            "   could build as a weekend project, "
            "7) 2-3 reference links for further reading. "
            "Use the provided vertical knowledge (key players, agent types, "
            "metrics) to ground the case study in reality. "
            "Make it feel like a mini Harvard case study, not a blog post."
        ),
    }
