"""
==============================================================================
PM-AI-AGENT: SQLite Data Engine & Scoring Model (db.py)
==============================================================================
PRODUCT ROLE:
  The database layer and algorithmic scoring core. Manages article storage,
  unshown card rotation, anonymous feedback history, and 4-tier ranking.

DATABASE TABLES:
  1. `articles`: The master catalog of curated articles across the 5 pillars.
     Stores metadata (title, author, verified URL, date, pillar, tier, difficulty,
     access type, PM summaries, outcome-based learning notes, and starter PRDs).
  2. `feedback`: Anonymous user sentiment log (upvote/downvote/notes). Zero PII.

SCORING ALGORITHM (Balanced 100-Point Model):
  Score = (W_Tier * 25) + (Relevance * 25) + (Recency * 25) + (Feedback * 25)
  - W_Tier: Tier 1 (1.00), Tier 2 (0.85), Tier 3 (0.70), Tier 4 (0.30)
  - Relevance: Base score from quality evaluation benchmarks (0 - 25 pts)
  - Recency: High points for last 6-12 months; decay curve for older content
  - Feedback: Upvotes boost weight (+0.15), downvotes suppress weight (-0.35)
==============================================================================
"""

import sqlite3
import json
import os
from datetime import datetime, date

DB_PATH = os.path.join(os.path.dirname(__file__), "pm_hub.db")

TIER_WEIGHTS = {
    "Tier 1": 1.00,  # AI Research Labs (OpenAI, Anthropic, DeepMind) & Elite Eng (Netflix, Uber, Stripe)
    "Tier 2": 0.85,  # Strategy, VCs & Business Schools (a16z, Sequoia, Stratechery, HBR)
    "Tier 3": 0.70,  # Practitioner & PM Newsletters (Lenny's, Reforge, Shreyas Doshi, Eugene Yan)
    "Tier 4": 0.30,  # General Tech & Community Analysis
}

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes tables and ensures schema integrity."""
    conn = get_connection()
    cursor = conn.cursor()

    # Articles table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        source_and_url TEXT NOT NULL UNIQUE,
        published_date TEXT NOT NULL,
        pillar TEXT NOT NULL,
        tier TEXT NOT NULL DEFAULT 'Tier 1',
        difficulty TEXT NOT NULL,
        access_type TEXT NOT NULL DEFAULT 'open',
        estimated_read_time TEXT NOT NULL,
        summary TEXT NOT NULL,
        summary_problem TEXT NOT NULL,
        summary_insight TEXT NOT NULL,
        summary_why_read TEXT NOT NULL,
        outcome_learning TEXT NOT NULL,
        key_takeaways TEXT NOT NULL,
        eval_score REAL DEFAULT 92.0,
        is_timeless INTEGER DEFAULT 0,
        starter_spec TEXT,
        status TEXT DEFAULT 'published',
        curated_by TEXT DEFAULT 'manual',
        reviewer_notes TEXT,
        review_rubric TEXT,
        staged_at TIMESTAMP,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Safe column migration for existing databases
    cursor.execute("PRAGMA table_info(articles)")
    existing_cols = {col["name"] for col in cursor.fetchall()}
    migrations = [
        ("status", "TEXT DEFAULT 'published'"),
        ("curated_by", "TEXT DEFAULT 'manual'"),
        ("reviewer_notes", "TEXT"),
        ("review_rubric", "TEXT"),
        ("staged_at", "TIMESTAMP"),
        ("published_at", "TIMESTAMP"),
    ]
    for col_name, col_type in migrations:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE articles ADD COLUMN {col_name} {col_type}")

    # Set any NULL status to 'published' for backward compatibility
    cursor.execute("UPDATE articles SET status = 'published' WHERE status IS NULL")

    # Anonymous feedback table (Zero PII)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id TEXT,
        article_title TEXT,
        article_url TEXT,
        feedback_type TEXT NOT NULL,
        user_prompt TEXT,
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Active session unshown pool tracking
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS session_views (
        session_id TEXT,
        article_id TEXT,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (session_id, article_id)
    )
    """)

    # HITL Critique Memory for in-context agent self-improvement
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS critique_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id TEXT,
        article_title TEXT,
        article_url TEXT,
        pillar TEXT,
        decision TEXT NOT NULL,
        critique_category TEXT NOT NULL,
        curator_critique TEXT NOT NULL,
        original_summary TEXT,
        edited_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Embedded lightweight evaluation telemetry table (MLflow/OpenTelemetry compatible JSON schema)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS eval_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        model_generator TEXT NOT NULL,
        model_judge TEXT NOT NULL,
        tier1_pass_count INTEGER DEFAULT 0,
        tier1_fail_count INTEGER DEFAULT 0,
        tier2_avg_score REAL DEFAULT 0.0,
        articles_staged INTEGER DEFAULT 0,
        telemetry_json TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()

def log_feedback(article_id: str, article_title: str, article_url: str, feedback_type: str, user_prompt: str = None, notes: str = None):
    """Logs anonymous user feedback to steer curation and re-ranking."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO feedback (article_id, article_title, article_url, feedback_type, user_prompt, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (article_id, article_title, article_url, feedback_type, user_prompt, notes))
    conn.commit()
    conn.close()

def get_feedback_signals():
    """Analyzes accumulated feedback to extract steering penalties and boosts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT feedback_type, user_prompt, notes, article_title FROM feedback ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()

    prompts = [r["user_prompt"] for r in rows if r["user_prompt"]]
    penalized_topics = []
    boosted_topics = []

    for r in rows:
        ftype = r["feedback_type"]
        title = (r["article_title"] or "").lower()
        if ftype in ("high_signal", "applied"):
            boosted_topics.append(title)
        elif ftype == "low_depth":
            penalized_topics.append(title)

    return {
        "prompts": prompts,
        "boosted_topics": boosted_topics,
        "penalized_topics": penalized_topics,
    }

def calculate_article_score(article: dict, signals: dict, current_year: int = 2026) -> float:
    """
    Computes dynamic ranking score:
    Score = (W_Tier * 25) + (Relevance * 25) + (RecencyScore * 25) + (FeedbackAlignment * 25)
    """
    # 1. Tier Score (0 - 25)
    tier = article.get("tier", "Tier 2")
    w_tier = TIER_WEIGHTS.get(tier, 0.50)
    tier_score = w_tier * 25.0

    # 2. Recency Score (0 - 25)
    pub_date_str = article.get("published_date", "2026-01-01")
    try:
        pub_date = datetime.strptime(pub_date_str, "%Y-%m-%d").date()
        today = date(2026, 9, 24)
        days_old = (today - pub_date).days
        if days_old <= 120:     # < 4 months
            recency_score = 25.0
        elif days_old <= 240:   # 4-8 months
            recency_score = 20.0
        elif days_old <= 365:   # 8-12 months
            recency_score = 12.0
        else:
            recency_score = 5.0 if article.get("is_timeless") else 0.0
    except Exception:
        recency_score = 15.0

    # 3. Base Relevance & Eval Score (0 - 25)
    eval_score = float(article.get("eval_score", 90.0))
    relevance_score = min(25.0, (eval_score / 100.0) * 25.0)

    # 4. Feedback Alignment (0 - 25)
    feedback_score = 15.0  # neutral baseline
    title_lower = article.get("title", "").lower()
    summary_lower = article.get("summary", "").lower()

    # Penalize if similar to downvoted fluff
    for pt in signals.get("penalized_topics", []):
        if any(w in title_lower or w in summary_lower for w in pt.split()[:3] if len(w) > 3):
            feedback_score -= 8.0
            break

    # Boost if user liked, applied, or prompted in this area
    boost_triggers = signals.get("prompts", []) + signals.get("boosted_topics", [])
    for b in boost_triggers:
        if any(w in title_lower or w in summary_lower for w in b.lower().split()[:3] if len(w) > 3):
            feedback_score += 10.0
            break

    feedback_score = max(0.0, min(25.0, feedback_score))

    total_score = tier_score + recency_score + relevance_score + feedback_score
    return round(total_score, 1)

def get_ranked_articles(limit: int = 50, pillar: str = "all", exclude_ids: list = None) -> list:
    """Returns top-ranked published articles after computing real-time scores."""
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM articles WHERE COALESCE(status, 'published') = 'published'"
    params = []
    if pillar and pillar != "all":
        query += " AND pillar = ?"
        params.append(pillar)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    signals = get_feedback_signals()
    articles = []
    exclude_set = set(exclude_ids or [])

    for r in rows:
        art = dict(r)
        if art["id"] in exclude_set:
            continue
        try:
            art["key_takeaways"] = json.loads(art["key_takeaways"]) if isinstance(art["key_takeaways"], str) else art["key_takeaways"]
        except Exception:
            art["key_takeaways"] = []
        if art.get("starter_spec"):
            try:
                art["starter_spec"] = json.loads(art["starter_spec"]) if isinstance(art["starter_spec"], str) else art["starter_spec"]
            except Exception:
                pass

        art["computed_score"] = calculate_article_score(art, signals)
        articles.append(art)

    # Sort descending by computed_score
    articles.sort(key=lambda x: x["computed_score"], reverse=True)
    return articles[:limit]

def replace_single_card(card_id: str, pillar: str, feedback_type: str, user_prompt: str = None, notes: str = None, currently_visible_ids: list = None) -> dict:
    """
    Immediate Loop Closure:
    Logs feedback, then finds the next best unshown candidate matching the pillar or user prompt.
    """
    # 1. Log feedback
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT title, source_and_url FROM articles WHERE id = ?", (card_id,))
    row = cursor.fetchone()
    title = row["title"] if row else ""
    url = row["source_and_url"] if row else ""
    conn.close()

    log_feedback(card_id, title, url, feedback_type, user_prompt, notes)

    # 2. Fetch candidates excluding currently visible cards
    visible = set(currently_visible_ids or [])
    visible.add(card_id)

    candidates = get_ranked_articles(limit=10, pillar=pillar if pillar != "Top Picks" else "all", exclude_ids=list(visible))
    if not candidates:
        candidates = get_ranked_articles(limit=5, pillar="all", exclude_ids=list(visible))

    if candidates:
        replacement = candidates[0]
        replacement["replacement_reason"] = "Replaced: Biased toward deeper technical architecture & verified 2026 practitioner source"
        return replacement
    return None

# ==============================================================================
# HITL CURATION & AGENT EVALUATION ENGINE
# ==============================================================================

def get_staged_articles() -> list:
    """Retrieves all candidate articles staged for human review."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM articles 
        WHERE status = 'staged' 
        ORDER BY staged_at DESC, created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    staged = []
    for r in rows:
        art = dict(r)
        try:
            art["key_takeaways"] = json.loads(art["key_takeaways"]) if isinstance(art["key_takeaways"], str) else art["key_takeaways"]
        except Exception:
            art["key_takeaways"] = []
        if art.get("starter_spec"):
            try:
                art["starter_spec"] = json.loads(art["starter_spec"]) if isinstance(art["starter_spec"], str) else art["starter_spec"]
            except Exception:
                pass
        if art.get("review_rubric"):
            try:
                art["review_rubric"] = json.loads(art["review_rubric"]) if isinstance(art["review_rubric"], str) else art["review_rubric"]
            except Exception:
                pass
        staged.append(art)
    return staged

def submit_curator_review(
    article_id: str,
    decision: str,
    rubric: dict,
    notes: str = "",
    edited_fields: dict = None
) -> dict:
    """
    Processes human curator decision (approved, edited, rejected) on a staged article.
    Logs feedback into critique_memory for agent self-improvement.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Fetch existing article
    cursor.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Article {article_id} not found")

    article = dict(row)
    rubric_json = json.dumps(rubric) if isinstance(rubric, dict) else str(rubric)

    if decision == "approved":
        cursor.execute("""
            UPDATE articles 
            SET status = 'published', 
                published_at = CURRENT_TIMESTAMP, 
                reviewer_notes = ?, 
                review_rubric = ?,
                curated_by = 'curator_manual'
            WHERE id = ?
        """, (notes, rubric_json, article_id))

        # If high praise or specific note, store positive exemplar
        if notes:
            cursor.execute("""
                INSERT INTO critique_memory (
                    article_id, article_title, article_url, pillar, decision,
                    critique_category, curator_critique, original_summary, edited_summary
                ) VALUES (?, ?, ?, ?, 'approved', 'high_quality_exemplar', ?, ?, NULL)
            """, (article_id, article["title"], article["source_and_url"], article["pillar"], notes, article["summary"]))

    elif decision == "edited":
        edits = edited_fields or {}
        new_title = edits.get("title", article["title"])
        new_problem = edits.get("summary_problem", article["summary_problem"])
        new_insight = edits.get("summary_insight", article["summary_insight"])
        new_outcome = edits.get("outcome_learning", article["outcome_learning"])
        new_why_read = edits.get("summary_why_read", article["summary_why_read"])
        new_summary = f"The Problem: {new_problem} The Insight: {new_insight} Why Read This: {new_why_read}"

        cursor.execute("""
            UPDATE articles 
            SET title = ?,
                summary = ?,
                summary_problem = ?,
                summary_insight = ?,
                summary_why_read = ?,
                outcome_learning = ?,
                status = 'published', 
                published_at = CURRENT_TIMESTAMP, 
                reviewer_notes = ?, 
                review_rubric = ?,
                curated_by = 'curator_manual'
            WHERE id = ?
        """, (new_title, new_summary, new_problem, new_insight, new_why_read, new_outcome, notes, rubric_json, article_id))

        # Store positive edit exemplar in critique_memory
        cursor.execute("""
            INSERT INTO critique_memory (
                article_id, article_title, article_url, pillar, decision,
                critique_category, curator_critique, original_summary, edited_summary
            ) VALUES (?, ?, ?, ?, 'edited', 'editorial_refinement', ?, ?, ?)
        """, (
            article_id,
            new_title,
            article["source_and_url"],
            article["pillar"],
            notes or "Refined summary to sharpen technical architecture and PM actionability.",
            article["summary"],
            new_summary
        ))

    elif decision == "rejected":
        reject_category = rubric.get("reject_reason", "low_depth") if isinstance(rubric, dict) else "low_depth"
        cursor.execute("""
            UPDATE articles 
            SET status = 'rejected', 
                reviewer_notes = ?, 
                review_rubric = ?
            WHERE id = ?
        """, (notes, rubric_json, article_id))

        # Store negative exemplar in critique_memory
        cursor.execute("""
            INSERT INTO critique_memory (
                article_id, article_title, article_url, pillar, decision,
                critique_category, curator_critique, original_summary, edited_summary
            ) VALUES (?, ?, ?, ?, 'rejected', ?, ?, ?, NULL)
        """, (
            article_id,
            article["title"],
            article["source_and_url"],
            article["pillar"],
            reject_category,
            notes or f"Rejected by PM Curator: {reject_category}",
            article["summary"]
        ))

    conn.commit()
    conn.close()
    return {"status": "success", "article_id": article_id, "decision": decision}

def get_recent_critiques(limit: int = 5) -> dict:
    """Retrieves human editorial feedback from critique_memory to dynamically steer agent prompts."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT article_title, article_url, pillar, critique_category, curator_critique, created_at 
        FROM critique_memory 
        WHERE decision = 'rejected' 
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    rejections = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT article_title, original_summary, edited_summary, curator_critique, created_at 
        FROM critique_memory 
        WHERE decision = 'edited' 
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    edits = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "rejections": rejections,
        "edits": edits
    }

def stage_new_candidate(art: dict, curated_by: str = "staysharp_agent") -> str:
    """Inserts a new candidate article into the staging queue with status='staged'."""
    conn = get_connection()
    cursor = conn.cursor()

    art_id = art.get("id") or f"candidate-{int(datetime.now().timestamp())}"
    cursor.execute("""
        INSERT OR REPLACE INTO articles (
            id, title, author, source_and_url, published_date, pillar, tier,
            difficulty, access_type, estimated_read_time, summary,
            summary_problem, summary_insight, summary_why_read,
            outcome_learning, key_takeaways, eval_score, is_timeless, starter_spec,
            status, curated_by, review_rubric, staged_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'staged', ?, ?, CURRENT_TIMESTAMP)
    """, (
        art_id,
        art["title"],
        art["author"],
        art["source_and_url"],
        art["published_date"],
        art["pillar"],
        art.get("tier", "Tier 2"),
        art.get("difficulty", "🟡 Intermediate"),
        art.get("access_type", "open"),
        art.get("estimated_read_time", "12 min"),
        art["summary"],
        art.get("summary_problem", art["summary"]),
        art.get("summary_insight", art["summary"]),
        art.get("summary_why_read", art["summary"]),
        art.get("outcome_learning", "Helps you evaluate architecture trade-offs."),
        json.dumps(art.get("key_takeaways", [])),
        art.get("eval_score", 90.0),
        art.get("is_timeless", 0),
        json.dumps(art["starter_spec"]) if art.get("starter_spec") else None,
        curated_by,
        json.dumps(art.get("pre_score_details", {}))
    ))

    conn.commit()
    conn.close()
    return art_id

def log_eval_run(
    run_id: str,
    model_generator: str,
    model_judge: str,
    tier1_pass_count: int,
    tier1_fail_count: int,
    tier2_avg_score: float,
    articles_staged: int,
    telemetry_data: dict
) -> int:
    """Logs lightweight MLflow/OpenTelemetry compatible telemetry directly to SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO eval_runs (
            run_id, model_generator, model_judge, tier1_pass_count,
            tier1_fail_count, tier2_avg_score, articles_staged, telemetry_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run_id,
        model_generator,
        model_judge,
        tier1_pass_count,
        tier1_fail_count,
        tier2_avg_score,
        articles_staged,
        json.dumps(telemetry_data)
    ))
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id

