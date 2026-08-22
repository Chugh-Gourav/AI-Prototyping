# StaySharp AI 🧠

A personal AI learning agent for Principal/Staff PMs — built with [Google ADK](https://adk.dev).

Keeps you sharp on **AI frontier research**, **hands-on technical skills**, **applied agentic AI**, and **business strategy** with curated, HBR-caliber recommendations.

## Quick Start

### 1. Set up your API key

Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey), then:

```bash
# Edit the .env file inside staysharp_agent/
echo "GOOGLE_API_KEY=your-key-here" > staysharp_agent/.env
```

### 2. Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Run the agent

**Browser UI (recommended):**
```bash
adk web staysharp_agent
```
Then open `http://localhost:8000` in your browser.

**Terminal mode:**
```bash
adk run staysharp_agent
```

## What You Can Ask

| Prompt | What it does |
|---|---|
| "Give me this week's reading list" | Curated 5-7 articles across AI, agentic AI, and business |
| "Give me a 60-minute RAG exercise" | Hands-on exercise brief (no code — you build it in Antigravity) |
| "Show me an ecommerce agent case study" | Applied agentic AI case study with architecture and business impact |
| "Break down unit economics for AI SaaS" | HBR-caliber business analysis with article recommendations |
| "Plan my learning week, I have 4 hours" | Day-by-day sprint plan across all four pillars |

## Tools

| Tool | Purpose |
|---|---|
| `curate_reading_list` | Weekly reading curation from tier-1 sources |
| `generate_exercise` | Hands-on exercise briefs (problem statements, no code) |
| `applied_agentic_case` | Applied AI case studies (ecommerce, travel, fintech, healthcare) |
| `business_deep_dive` | Business analysis + article recommendations |
| `weekly_sprint_plan` | Structured weekly learning plans (3-4hr minimum) |
| `google_search` | Live web search for the latest content |

## Learning Pillars

1. **AI Frontier** — LLMs, agents, evals, context engineering, multimodal
2. **Hands-On Labs** — Build things yourself in Antigravity IDE
3. **Applied Agentic AI** — Real-world agent architectures in industry
4. **Business Acumen** — Unit economics, strategy, compete with MBAs

## Architecture

```
staysharp_agent/
├── __init__.py
├── agent.py              # Root agent (Gemini 2.0 Flash + 6 tools)
├── .env                   # API key config
├── tools/
│   ├── curate_reading.py  # Source registry + curation logic
│   ├── exercises.py       # Exercise topic registry + brief generator
│   ├── applied_cases.py   # Vertical knowledge bases + case study generator
│   ├── business.py        # Business frameworks + article source registry
│   └── weekly_plan.py     # Time allocation engine + sprint planner
└── prompts/
    └── system_prompt.py   # PM persona, quality bar, source hierarchy
```

Built with ❤️ using Google ADK.
