"""
AI Tutor — Configuration
Model names, rules, and path constants.
"""
from pathlib import Path

# ── Ollama Models ──────────────────────────────────────────────────────────
MODEL_CHAT  = "qwen3:0.6b"         # Q&A + quiz generation
MODEL_LP    = "gemma3:12b"         # learning path + doubt solutions
MODEL_VIDEO = "qwen2.5-coder:7b"  # Manim video scripts
MODEL_EMBED = "qwen3-embedding"   # embeddings



# ── Quiz / Pipeline Rules ─────────────────────────────────────────────────
RULES = {
    "quiz": {
        "num_questions": 10,
        "difficulty_distribution": {"easy": 3, "medium": 5, "hard": 2},
        "type_distribution":       {"mcq": 5, "short_answer": 3, "true_false": 2},
        "mcq_options_count": 4,
        "context_chunks_per_question": 3,
    },
    "learning_path": {
        "model": MODEL_LP,
        "direction": "TD",
    },
    "video": {
        "model": MODEL_VIDEO,
        "duration_seconds": 90,
        "manim_class_name": "ConceptExplainer",
    },
    "doubts": {
        "solution_model": MODEL_LP,
    },
    "heatmap": {
        "model": MODEL_LP,
        "min_frequency_for_highlight": 2,
    },
}

# ── Max upload size ────────────────────────────────────────────────────────
MAX_PDF_SIZE_MB = 50
