"""Tool: Generate a weekly learning sprint plan."""

from datetime import date


def weekly_sprint_plan(
    hours_available: float = 3.5,
    priority: str = "balanced",
) -> dict:
    """Generate a structured weekly learning sprint plan across all four pillars.

    Creates a day-by-day learning schedule with specific activities, readings,
    and milestones. Designed for a minimum of 3-4 hours per week.

    Args:
        hours_available: Total hours available for learning this week.
            Default is 3.5 hours (minimum recommended). Can go up to 8+
            for intensive weeks.
        priority: Which learning pillar to weight more heavily this week.
            Options: "ai_frontier" (latest AI research and papers),
            "hands_on" (more exercise time),
            "applied_ai" (industry case studies),
            "business" (strategy and unit economics),
            "balanced" (equal distribution across all pillars).

    Returns:
        A dictionary with time allocation guidelines, pillar definitions,
        and formatting instructions for the agent to produce a structured
        weekly plan.
    """
    # Time allocation based on priority
    if priority == "balanced":
        allocation = {
            "reading_articles": 0.30,
            "hands_on_exercise": 0.35,
            "applied_ai_case": 0.15,
            "business_strategy": 0.20,
        }
    elif priority == "ai_frontier":
        allocation = {
            "reading_articles": 0.50,
            "hands_on_exercise": 0.25,
            "applied_ai_case": 0.10,
            "business_strategy": 0.15,
        }
    elif priority == "hands_on":
        allocation = {
            "reading_articles": 0.20,
            "hands_on_exercise": 0.50,
            "applied_ai_case": 0.15,
            "business_strategy": 0.15,
        }
    elif priority == "applied_ai":
        allocation = {
            "reading_articles": 0.25,
            "hands_on_exercise": 0.20,
            "applied_ai_case": 0.40,
            "business_strategy": 0.15,
        }
    elif priority == "business":
        allocation = {
            "reading_articles": 0.20,
            "hands_on_exercise": 0.20,
            "applied_ai_case": 0.10,
            "business_strategy": 0.50,
        }
    else:
        allocation = {
            "reading_articles": 0.30,
            "hands_on_exercise": 0.35,
            "applied_ai_case": 0.15,
            "business_strategy": 0.20,
        }

    # Calculate hours per pillar
    hours_per_pillar = {
        pillar: round(hours_available * pct, 1)
        for pillar, pct in allocation.items()
    }

    return {
        "task": "generate_weekly_sprint_plan",
        "week_of": date.today().isoformat(),
        "hours_available": hours_available,
        "priority": priority,
        "hours_per_pillar": hours_per_pillar,
        "allocation_percentages": allocation,
        "instructions": (
            f"Create a weekly learning sprint plan for the week of "
            f"{date.today().isoformat()}. The PM has {hours_available} hours "
            f"available with priority on '{priority}'. "
            "Include: "
            "1) **Week overview** — theme, goals, and what 'done' looks like, "
            "2) **Day-by-day schedule** — spread across 5-6 days with specific "
            "   activities and time blocks (not all on one day!), "
            "3) **Reading list** — 2-3 specific articles/papers to read, "
            "4) **Exercise brief** — 1 hands-on exercise with problem statement "
            "   (no code, just the brief for Antigravity IDE), "
            "5) **Case study** — 1 applied AI case to analyze, "
            "6) **Business read** — 1 business/strategy article to read, "
            "7) **Weekly milestone** — what they should be able to explain "
            "   to a colleague by end of week, "
            "8) **Stretch goal** — if they have extra time. "
            f"Time allocation: {hours_per_pillar}. "
            "Make it realistic — this person has a demanding PM job. "
            "Suggest morning commute reads vs evening deep-work sessions."
        ),
    }
