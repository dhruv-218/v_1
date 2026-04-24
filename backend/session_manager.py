"""
AI Tutor — Session Manager
In-memory session state management with disk persistence.
"""

import uuid
import json
from dataclasses import dataclass, field
from typing import Dict, Optional
from pathlib import Path
from datetime import datetime

@dataclass
class SessionState:
    id: str
    pdf_name: str
    pdf_path: Path
    output_dir: Path
    status: str = "processing"
    stage: str = "extracting"
    progress: int = 0
    message: str = "Starting..."
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    questions: list = field(default_factory=list)
    doubts: list = field(default_factory=list)
    video_jobs: dict = field(default_factory=dict)
    rag_engine: object = None
    tracker: object = None

_sessions: Dict[str, SessionState] = {}

_SESSIONS_ROOT = Path("sessions")


def _session_meta_path(sid: str) -> Path:
    return _SESSIONS_ROOT / sid / "_session_meta.json"


def _persist(session: SessionState):
    """Save lightweight session metadata to disk."""
    try:
        meta = {
            "id": session.id,
            "pdf_name": session.pdf_name,
            "pdf_path": str(session.pdf_path),
            "output_dir": str(session.output_dir),
            "status": session.status,
            "stage": session.stage,
            "progress": session.progress,
            "message": session.message,
            "created_at": session.created_at,
            "video_jobs": session.video_jobs,
        }
        _session_meta_path(session.id).write_text(json.dumps(meta, indent=2))
    except Exception as e:
        print(f"[session] persist error: {e}")


def _load_session_from_disk(sid: str) -> Optional[SessionState]:
    """Reconstruct a SessionState from saved metadata + quiz.json."""
    meta_file = _session_meta_path(sid)
    if not meta_file.exists():
        return None
    try:
        meta = json.loads(meta_file.read_text())
        output_dir = Path(meta["output_dir"])
        session = SessionState(
            id=meta["id"],
            pdf_name=meta["pdf_name"],
            pdf_path=Path(meta["pdf_path"]),
            output_dir=output_dir,
            status=meta.get("status", "ready"),
            stage=meta.get("stage", "ready"),
            progress=meta.get("progress", 100),
            message=meta.get("message", ""),
            created_at=meta.get("created_at", ""),
            video_jobs=meta.get("video_jobs", {}),
        )
        # Reload questions from quiz.json if available
        quiz_file = output_dir / "quiz.json"
        if quiz_file.exists():
            session.questions = json.loads(quiz_file.read_text())
        return session
    except Exception as e:
        print(f"[session] load error for {sid}: {e}")
        return None


def create_session(pdf_name: str, pdf_path: Path, output_dir: Path) -> SessionState:
    sid = str(uuid.uuid4())
    state = SessionState(id=sid, pdf_name=pdf_name, pdf_path=pdf_path, output_dir=output_dir)
    _sessions[sid] = state
    return state


def persist_session(session: SessionState):
    """Call this whenever session state changes significantly."""
    _persist(session)


def get_session(session_id: str) -> Optional[SessionState]:
    # 1. Check in-memory cache
    if session_id in _sessions:
        return _sessions[session_id]
    # 2. Try to restore from disk
    session = _load_session_from_disk(session_id)
    if session:
        _sessions[session_id] = session
        return session
    return None
