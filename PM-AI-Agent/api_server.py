from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import re
import urllib.parse
import requests
from dotenv import load_dotenv
from google import genai
from google.genai import types
from staysharp_agent.tools.curate_reading import (
    curate_reading_list,
    APPROVED_DOMAINS,
)

dotenv_path = os.path.join(os.path.dirname(__file__), 'staysharp_agent', '.env')
load_dotenv(dotenv_path, override=True)

# Force disable Vertex AI to use the Developer API (API Key)
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "false"
os.environ.pop("GOOGLE_CLOUD_PROJECT", None)
os.environ.pop("GCLOUD_PROJECT", None)
os.environ["GEMINI_API_KEY"] = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")

app = FastAPI()

# Allow CORS for local development and eventual cloud hosting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _google_search_fallback(title: str, source: str, site_filter: str) -> str:
    """Build a site-restricted Google Search URL for an article."""
    # Pick the most specific domain for the source if we can
    query = f"{title} {source}"
    query = urllib.parse.quote_plus(query.strip())
    return f"https://www.google.com/search?q={query}"


def _is_approved_domain(url: str) -> bool:
    """Check if a URL belongs to one of the APPROVED_DOMAINS."""
    try:
        # Extract the domain from the URL
        domain_match = re.search(r'https?://(?:www\.)?([^/]+)', url)
        if not domain_match:
            return False
        full_domain = domain_match.group(1).lower()

        # Check against each approved domain
        for approved in APPROVED_DOMAINS:
            if full_domain == approved or full_domain.endswith("." + approved):
                return True
        return False
    except Exception:
        return False


def _verify_and_fix_urls(articles: list[dict], site_filter: str) -> list[dict]:
    """Verify each article URL: must be from an approved domain AND not 404.

    1. If the URL isn't from an approved domain → Google Search fallback
    2. If the URL 404s → Google Search fallback
    3. Otherwise → keep it
    """
    for article in articles:
        raw_url = article.get("source_and_url", "")

        # Extract URL if the LLM included extra text like "Source (https://...)"
        url_match = re.search(r'(https?://[^\s\)]+)', raw_url)
        if not url_match:
            article["source_and_url"] = _google_search_fallback(
                article.get("title", ""), article.get("pillar", ""), site_filter
            )
            continue

        clean_url = url_match.group(1)

        # ── Gate 1: Domain allowlist ──
        if not _is_approved_domain(clean_url):
            print(f"    ✗ off-list domain: {clean_url}")
            article["source_and_url"] = _google_search_fallback(
                article.get("title", ""), article.get("pillar", ""), site_filter
            )
            continue

        # ── Gate 2: HTTP check (HEAD → GET fallback) ──
        try:
            resp = requests.head(
                clean_url,
                headers={"User-Agent": "Mozilla/5.0"},
                allow_redirects=True,
                timeout=2,
            )
            if resp.status_code == 404:
                print(f"    ✗ 404: {clean_url}")
                article["source_and_url"] = _google_search_fallback(
                    article.get("title", ""), article.get("pillar", ""), site_filter
                )
            else:
                article["source_and_url"] = clean_url
                print(f"    ✓ {resp.status_code}: {clean_url}")
        except requests.exceptions.RequestException:
            try:
                resp = requests.get(
                    clean_url,
                    headers={"User-Agent": "Mozilla/5.0"},
                    allow_redirects=True,
                    timeout=3,
                    stream=True,
                )
                resp.close()
                if resp.status_code == 404:
                    print(f"    ✗ 404 (GET): {clean_url}")
                    article["source_and_url"] = _google_search_fallback(
                        article.get("title", ""), article.get("pillar", ""), site_filter
                    )
                else:
                    article["source_and_url"] = clean_url
                    print(f"    ✓ {resp.status_code} (GET): {clean_url}")
            except requests.exceptions.RequestException:
                print(f"    ? unreachable: {clean_url}")
                article["source_and_url"] = _google_search_fallback(
                    article.get("title", ""), article.get("pillar", ""), site_filter
                )

    return articles


@app.get("/api/recommendations")
def get_recommendations():
    """Fetches new recommendations by running Gemini directly with Google Search grounding."""
    print("Generating AI recommendations using Gemini + Google Search...")

    # 1. Get the curation configuration from the tool
    curation_config = curate_reading_list(focus_area="all")

    # 2. Build approved domains for server-side filtering
    site_filter = curation_config["site_filter"]

    # 3. Prompt searches by SOURCE NAME (natural, gets good volume).
    #    Server-side _is_approved_domain() enforces the domain allowlist.
    prompt = f"""You are an AI learning coach for a Principal/Staff PM.
Find 8-12 recent must-read articles (last 12 months, week of {curation_config['target_week']}).

ONLY recommend articles from these specific sources:
- AI Frontier: arXiv, Google DeepMind blog, Anthropic blog, OpenAI blog, Simon Willison, Chip Huyen, Lilian Weng, Hugging Face blog, LangChain blog
- Agentic AI: arXiv, Google ADK (adk.dev), Anthropic agent patterns, CrewAI blog, LangChain/LangGraph
- Business: Harvard Business Review (hbr.org), Stratechery, Lenny's Newsletter, First Round Review, a16z blog, MIT Sloan Review, McKinsey, Reforge
- Applied AI: a16z, Google Cloud blog, TechCrunch AI, VentureBeat AI

Cover all 4 pillars. Include at least 2 Business articles.
NO listicles, NO clickbait, NO surface-level overviews.
Use google_search to find real articles. Provide EXACT URLs from search results only.

Return ONLY a raw JSON array (no markdown). Schema per object:
{{"title":"string","author":"string","source_and_url":"string","published_date":"YYYY-MM-DD","why_read_this":"string","estimated_read_time":"string","difficulty":"string","pillar":"string"}}"""




    try:
        # Check if API key is set
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set. "
                "Please set it before running the server."
            )

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}],  # Enable Google Search grounding
                temperature=0.4,
            ),
        )

        # --- Parse the LLM's JSON text output ---
        output_text = response.text.strip()

        if output_text.startswith("```json"):
            output_text = output_text[7:]
        if output_text.startswith("```"):
            output_text = output_text[3:]
        if output_text.endswith("```"):
            output_text = output_text[:-3]

        output_text = output_text.strip()

        data = json.loads(output_text)
        if not isinstance(data, list):
            raise ValueError("Expected a JSON array.")

        # --- Verify URLs: domain allowlist + 404 check ---
        print(f"  Verifying {len(data)} article URLs...")
        data = _verify_and_fix_urls(data, site_filter)

        print(f"  Returning {len(data)} articles with verified URLs")
        return data

    except json.JSONDecodeError:
        print(f"JSONDecodeError. Output text was: {output_text}")
        raise HTTPException(
            status_code=500, detail="Failed to parse agent output as JSON"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
