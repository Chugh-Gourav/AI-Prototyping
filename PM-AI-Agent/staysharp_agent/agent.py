"""StaySharp AI — Root Agent Definition.

A personal AI learning agent for Principal/Staff PMs to stay sharp on
AI, agentic systems, hands-on technical skills, and business strategy.

Built with Google ADK (Agent Development Kit).
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
