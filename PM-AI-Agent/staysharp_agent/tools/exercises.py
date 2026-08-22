"""Tool: Generate hands-on exercise ideas (problem statements only, no code)."""


# Exercise topic registry with scoping guidance
EXERCISE_TOPICS = {
    "rag_pipeline": {
        "title": "Build a RAG Pipeline",
        "concepts": [
            "document chunking strategies",
            "embedding models (text-embedding-004, etc.)",
            "vector stores (ChromaDB, Pinecone, Weaviate)",
            "retrieval strategies (semantic, hybrid, reranking)",
            "evaluation (faithfulness, relevance, completeness)",
        ],
        "tools": ["langchain", "llamaindex", "chromadb", "google-genai"],
    },
    "agent_building": {
        "title": "Build an AI Agent",
        "concepts": [
            "tool definition and registration",
            "agent orchestration (sequential, parallel, loop)",
            "state management and memory",
            "error handling and fallbacks",
            "evaluation and testing",
        ],
        "tools": ["google-adk", "langchain", "langgraph", "crewai"],
    },
    "evals": {
        "title": "Build an Eval Framework",
        "concepts": [
            "LLM-as-judge patterns",
            "human annotation workflows",
            "metric design (precision, recall, custom rubrics)",
            "regression testing for prompts",
            "A/B testing for model outputs",
        ],
        "tools": ["promptfoo", "deepeval", "ragas", "langsmith"],
    },
    "prompt_engineering": {
        "title": "Advanced Prompt Engineering",
        "concepts": [
            "chain-of-thought prompting",
            "few-shot with dynamic example selection",
            "structured output (JSON mode, function calling)",
            "system prompt design patterns",
            "context window management",
        ],
        "tools": ["google-genai", "openai", "anthropic"],
    },
    "fine_tuning": {
        "title": "Fine-Tune a Model",
        "concepts": [
            "dataset preparation and formatting",
            "LoRA / QLoRA techniques",
            "training hyperparameters",
            "evaluation and benchmarking",
            "deployment considerations",
        ],
        "tools": ["transformers", "peft", "trl", "unsloth"],
    },
    "multimodal": {
        "title": "Build a Multimodal Application",
        "concepts": [
            "image understanding with Gemini",
            "video analysis pipelines",
            "document parsing (PDF, slides)",
            "multimodal RAG",
            "evaluation of multimodal outputs",
        ],
        "tools": ["google-genai", "pillow", "pymupdf", "unstructured"],
    },
    "mcp_server": {
        "title": "Build an MCP Server",
        "concepts": [
            "Model Context Protocol specification",
            "tool vs resource vs prompt primitives",
            "server implementation patterns",
            "client integration and testing",
            "security considerations",
        ],
        "tools": ["mcp", "fastmcp", "uvicorn"],
    },
    "context_engineering": {
        "title": "Context Engineering Deep Dive",
        "concepts": [
            "context window optimization",
            "dynamic context selection",
            "retrieval-augmented generation vs long context",
            "context caching strategies",
            "measuring context utilization",
        ],
        "tools": ["google-genai", "tiktoken", "langchain"],
    },
}


def generate_exercise(
    topic: str = "agent_building",
    difficulty: str = "intermediate",
    time_budget_minutes: int = 60,
) -> dict:
    """Generate a hands-on exercise idea with problem statement and expected outcome.

    This tool generates exercise BRIEFS only — problem statements, expected
    outcomes, and reference materials. It does NOT generate starter code or
    solutions. The user takes these briefs into Antigravity IDE to build
    the solution themselves.

    Args:
        topic: The exercise topic area.
            Options: "rag_pipeline", "agent_building", "evals",
            "prompt_engineering", "fine_tuning", "multimodal",
            "mcp_server", "context_engineering".
        difficulty: Exercise difficulty level.
            Options: "beginner", "intermediate", "advanced".
        time_budget_minutes: How long the exercise should take.
            Options: 30, 60, 120.

    Returns:
        A dictionary containing the topic metadata, difficulty parameters,
        and formatting instructions for the agent to produce a well-scoped
        exercise brief.
    """
    topic_info = EXERCISE_TOPICS.get(topic, EXERCISE_TOPICS["agent_building"])

    return {
        "task": "generate_exercise_brief",
        "topic": topic_info["title"],
        "topic_key": topic,
        "key_concepts": topic_info["concepts"],
        "suggested_tools": topic_info["tools"],
        "difficulty": difficulty,
        "time_budget_minutes": time_budget_minutes,
        "available_topics": list(EXERCISE_TOPICS.keys()),
        "instructions": (
            "Generate a hands-on exercise BRIEF for the specified topic. "
            "Do NOT generate any starter code or solution code. "
            "The user will solve this exercise themselves in Antigravity IDE. "
            f"Difficulty: {difficulty}. Time budget: {time_budget_minutes} min. "
            "Include: "
            "1) A compelling problem statement (what and why it matters), "
            "2) Expected outcome (what 'done' looks like concretely), "
            "3) Key concepts they'll learn by doing this, "
            "4) Suggested tools/libraries to install, "
            "5) 2-3 bonus challenges if they finish early, "
            "6) 3-5 reference links (docs, papers, tutorials to consult). "
            "Make it practical and PM-relevant — not a toy example. "
            "Scope it to be completable within the time budget."
        ),
    }
