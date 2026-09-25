"""
==============================================================================
PM-AI-AGENT: Conversational Agent Root (agent.py)
==============================================================================
PRODUCT ROLE:
  Executive learning coach for Principal/Staff PMs and Product Leaders.
  Built using Google ADK (Agent Development Kit) & Gemini 2.5 Flash.
  Equipped with 5 specialized product tools:
  - curate_reading_list: Real-time discovery grounded in Tier 1-3 allowlisted sources.
  - generate_exercise: Hands-on code & prompt architecture exercises.
  - applied_agentic_case: Production case studies (Netflix, Stripe, Databricks).
  - business_deep_dive: Token economics, pricing models, and gross margin analysis.
  - weekly_sprint_plan: Personalized 5-day learning sprints for PM skill upgrades.
==============================================================================
"""

from google.adk.agents import Agent

from .prompts.system_prompt import SYSTEM_PROMPT
from .tools.curate_reading import curate_reading_list
from .tools.exercises import generate_exercise
from .tools.applied_cases import applied_agentic_case
from .tools.business import business_deep_dive
from .tools.weekly_plan import weekly_sprint_plan


root_agent = Agent(
    model="gemini-2.5-flash",
    name="AI_PM_Assistant",
    description=(
        "A personal AI learning coach for Principal/Staff PMs. "
        "Curates weekly reading lists, generates hands-on exercise ideas, "
        "analyzes applied agentic AI case studies, provides HBR-caliber "
        "business analysis, and creates structured weekly learning plans."
    ),
    instruction=SYSTEM_PROMPT,
    tools=[
        curate_reading_list,
        generate_exercise,
        applied_agentic_case,
        business_deep_dive,
        weekly_sprint_plan,
    ],
)
