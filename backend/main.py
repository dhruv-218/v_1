"""
AI Tutor — FastAPI Server
Endpoints interacting with the local pipeline and ChromaDB.
"""

import asyncio
import json
import subprocess
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import RULES, MODEL_CHAT, MAX_PDF_SIZE_MB
from session_manager import create_session, get_session, persist_session
import pipeline

# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI(title="AI Tutor API (Local Storage)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSIONS_DIR = Path("sessions")
SESSIONS_DIR.mkdir(exist_ok=True)


# ── Request models ─────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question_id: int
    message: str
    history: list[dict] = []

class SubmitAnswerRequest(BaseModel):
    question_id: int
    user_answer: str


# ════════════════════════════════════════════════════════════════════════════
#  POST /api/process — Upload PDF & start pipeline
# ════════════════════════════════════════════════════════════════════════════

@app.post("/api/process")
async def process_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted.")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_PDF_SIZE_MB:
        raise HTTPException(400, f"File exceeds {MAX_PDF_SIZE_MB} MB limit.")

    session_dir = SESSIONS_DIR / "temp"
    # We will generate a real session_id inside create_session
    pdf_path = SESSIONS_DIR / file.filename
    pdf_path.write_bytes(contents)

    # create session handles moving to its own directory
    session = create_session(file.filename, pdf_path, SESSIONS_DIR)
    
    # move file
    actual_dir = SESSIONS_DIR / session.id
    actual_dir.mkdir(parents=True, exist_ok=True)
    actual_pdf = actual_dir / file.filename
    pdf_path.rename(actual_pdf)
    session.pdf_path = actual_pdf
    session.output_dir = actual_dir

    # Start pipeline
    asyncio.create_task(asyncio.to_thread(_run_pipeline, session))

    return {
        "session_id": session.id,
        "status": "processing",
        "pdf_name": file.filename,
    }


def _run_pipeline(session):
    try:
        def on_progress(pct, msg):
            session.stage = "embedding" if pct > 10 else "extracting"
            session.progress = pct
            session.message = msg

        rag = pipeline.RAGEngine(str(session.pdf_path), session_id=session.id)
        rag.build(progress_callback=on_progress)
        session.rag_engine = rag

        session.stage = "generating_questions"
        session.progress = 50
        session.message = "Generating questions..."

        def on_quiz_progress(pct, msg):
            session.progress = pct
            session.message = msg

        quiz_file = session.output_dir / "quiz.json"
        questions = pipeline.generate_quiz(rag, str(quiz_file), RULES, progress_callback=on_quiz_progress)
        session.questions = questions

        tracker = pipeline.DoubtTracker(str(session.output_dir / "doubts.json"), rag=rag)
        session.tracker = tracker

        pipeline.generate_learning_path(rag, str(session.output_dir / "learning_path.md"), RULES)

        session.stage = "ready"
        session.progress = 100
        session.message = "Ready!"
        session.status = "ready"
        persist_session(session)

    except Exception as e:
        print(f"Pipeline error for session {session.id}: {e}")
        session.status = "error"
        session.message = f"Pipeline error: {str(e)}"


# ════════════════════════════════════════════════════════════════════════════
#  GET /api/status/{session_id}
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/status/{session_id}")
async def get_status(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    return {
        "stage":    session.stage,
        "progress": session.progress,
        "message":  session.message,
        "status":   session.status
    }


# ════════════════════════════════════════════════════════════════════════════
#  GET /api/quiz/{session_id}
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/quiz/{session_id}")
async def get_quiz(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    if session.status != "ready":
        raise HTTPException(409, f"Quiz not ready. Current stage: {session.stage}")

    return {
        "chapter": "Chapter 1",
        "total_questions": len(session.questions),
        "questions": session.questions,
    }


# ════════════════════════════════════════════════════════════════════════════
#  POST /api/submit-answer/{session_id}
# ════════════════════════════════════════════════════════════════════════════

@app.post("/api/submit-answer/{session_id}")
async def submit_answer(session_id: str, req: SubmitAnswerRequest):
    session = get_session(session_id)
    if not session or not session.questions:
        raise HTTPException(404, "Session or questions not found.")

    q = next((x for x in session.questions if x["id"] == req.question_id), None)
    if not q:
        raise HTTPException(404, "Question not found.")

    correct = str(q.get("answer", "")).strip().upper()
    given   = req.user_answer.strip().upper()
    is_correct = correct in given or given in correct

    if not is_correct and session.tracker:
        asyncio.create_task(asyncio.to_thread(session.tracker.log_wrong, q, req.user_answer))

    return {
        "is_correct": is_correct,
        "correct_answer": q["answer"],
        "solution": q.get("solution", ""),
    }


# ════════════════════════════════════════════════════════════════════════════
#  POST /api/chat/{session_id}
# ════════════════════════════════════════════════════════════════════════════

@app.post("/api/chat/{session_id}")
async def chat(session_id: str, req: ChatRequest):
    session = get_session(session_id)
    q = next((x for x in session.questions if x["id"] == req.question_id), None) if session else None
    
    context_parts = []
    if q:
        context_parts.append(f"Question: {q.get('question', '')}")
        context_parts.append(f"Correct answer: {q.get('answer', '')}")
        context_parts.append(f"Solution: {q.get('solution', '')}")
        if q.get("context_chunks"):
            context_parts.append("Reference material:\n" + "\n".join(q["context_chunks"]))

    context = "\n\n".join(context_parts)
    system_msg = (
        "You are an expert tutor helping a student understand a concept. "
        "Use the context below to give accurate, clear explanations.\n\n"
        f"Context:\n{context}"
    )
    
    messages = [{"role": "system", "content": system_msg}]
    for h in req.history:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": req.message})

    import ollama as _ollama
    client = _ollama.AsyncClient()

    async def generate():
        try:
            async for chunk in await client.chat(
                model=MODEL_CHAT,
                messages=messages,
                stream=True,
                options={"temperature": 0.4},
            ):
                token = chunk.get("message", {}).get("content", "")
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ════════════════════════════════════════════════════════════════════════════
#  GET /api/video/{session_id}/{question_id}
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/video/{session_id}/{question_id}")
async def get_video(session_id: str, question_id: int):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")

    vid_dir = session.output_dir / "video_scripts"
    meta_file = vid_dir / "q{}_{}_meta.json".format(question_id, "*") # simple glob lookup 
    # Let's find the exact meta file
    meta = None
    for f in vid_dir.glob(f"q{question_id}_*_meta.json"):
        meta = json.loads(f.read_text())
        break
        
    video_path = None
    media_dir = vid_dir / "media" / "videos"
    if media_dir.exists() and meta:
        cname = meta.get("class_name", "")
        mp4s = list(media_dir.rglob(f"*{cname}*.mp4"))
        if mp4s:
            mp4s.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            rel_path = mp4s[0].relative_to(SESSIONS_DIR)
            video_path = f"http://localhost:8000/sessions/{rel_path}"

    status = session.video_jobs.get(question_id, "not_generated" if not meta else "not_rendered")

    return {
        "script_path": meta.get("script_file") if meta else None,
        "video_path": video_path,
        "run_command": meta.get("run_command") if meta else None,
        "status": status,
    }


# ════════════════════════════════════════════════════════════════════════════
#  POST /api/video/render/{session_id}/{question_id}
# ════════════════════════════════════════════════════════════════════════════

@app.post("/api/video/render/{session_id}/{question_id}")
async def render_video(session_id: str, question_id: int):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")

    q = next((x for x in session.questions if x["id"] == question_id), None)
    if not q:
        raise HTTPException(404, "Question not found.")

    vid_dir = session.output_dir / "video_scripts"
    meta = pipeline.generate_video_script(q, vid_dir, RULES)
    run_cmd = meta["run_command"]

    session.video_jobs[question_id] = "rendering"

    async def _render():
        try:
            proc = await asyncio.create_subprocess_shell(
                run_cmd,
                cwd=str(vid_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode == 0:
                session.video_jobs[question_id] = "rendered"
            else:
                session.video_jobs[question_id] = "failed"
                print(f"Manim failed for Q{question_id}:\n{stderr.decode()}")
            persist_session(session)
        except Exception as e:
            session.video_jobs[question_id] = "failed"
            persist_session(session)
            print(f"Manim exception: {e}")

    asyncio.create_task(_render())

    return {"job_id": f"{session_id}_{question_id}", "status": "rendering"}


# ════════════════════════════════════════════════════════════════════════════
#  GET /api/learning-path/{session_id}
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/learning-path/{session_id}")
async def get_learning_path(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")

    lp_file = session.output_dir / "learning_path.md"
    hlp_file = session.output_dir / "heatmap_learning_path.md"
    
    if not lp_file.exists():
        raise HTTPException(404, "Learning path not ready.")
        
    if not hlp_file.exists() and session.tracker:
        asyncio.create_task(asyncio.to_thread(pipeline.generate_heatmap_lp, session.tracker, str(hlp_file), RULES))

    return {
        "mermaid": lp_file.read_text(),
        "heatmap_mermaid": hlp_file.read_text() if hlp_file.exists() else None
    }


# ════════════════════════════════════════════════════════════════════════════
#  GET /api/doubts/{session_id}
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/doubts/{session_id}")
async def get_doubts(session_id: str):
    session = get_session(session_id)
    return {"doubts": session.tracker.doubts if session and session.tracker else []}


app.mount("/sessions", StaticFiles(directory="sessions"), name="sessions")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_excludes=["sessions/*", "sessions/**/*"],
    )
