"""
AI Tutor — Pipeline Module
Local storage and ChromaDB implementations extracted from the notebook.
"""

import re
import json
import uuid
from pathlib import Path
from collections import Counter

import fitz          # PyMuPDF
import ollama
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import MODEL_CHAT, MODEL_LP, MODEL_VIDEO, MODEL_EMBED


# ════════════════════════════════════════════════════════════════════════════
#  PROMPT TEMPLATES
# ════════════════════════════════════════════════════════════════════════════

_MCQ = """You are an expert exam writer. Using ONLY the context below, write ONE {difficulty}-level MCQ.
Context (page {page}):
{context}
Return ONLY valid JSON (no markdown, no extra text):
{{"type":"mcq","difficulty":"{difficulty}","topic":"<short name>","page_number":{page},
 "question":"<question>","options":["A. ","B. ","C. ","D. "],"answer":"<A/B/C/D>",
 "solution":"<detailed explanation>"}}"""

_SA = """You are an expert exam writer. Using ONLY the context below, write ONE {difficulty}-level short-answer question.
Context (page {page}):
{context}
Return ONLY valid JSON (no markdown, no extra text):
{{"type":"short_answer","difficulty":"{difficulty}","topic":"<short name>","page_number":{page},
 "question":"<question>","answer":"<ideal answer>","solution":"<detailed explanation>"}}"""

_TF = """You are an expert exam writer. Using ONLY the context below, write ONE {difficulty}-level true/false question.
Context (page {page}):
{context}
Return ONLY valid JSON (no markdown, no extra text):
{{"type":"true_false","difficulty":"{difficulty}","topic":"<short name>","page_number":{page},
 "question":"<statement>","answer":"True or False","solution":"<detailed explanation>"}}"""

PROMPTS = {"mcq": _MCQ, "short_answer": _SA, "true_false": _TF}

_LP_PROMPT = """You are an expert curriculum designer. Analyse this textbook chapter content and produce a complete Mermaid learning path.

Content (key chunks):
{content}

Create a `flowchart {direction}` Mermaid diagram that shows:
  • Main topic at the top
  • Major subtopics as branches
  • Prerequisite arrows between concepts
  • Leaf nodes = specific skills to acquire
  • subgraph blocks to group related clusters
  • Node color: easy=green, medium=orange, hard=red

Output ONLY the Mermaid code. No explanation. No fences."""

_MANIM_PROMPT = """You are a Manim Community Edition expert and educator.
Write a complete, runnable Manim script that visually explains the concept below.

Question : {question}
Answer   : {answer}
Solution : {solution}
Context  : {context}
Topic    : {topic}

Requirements:
1. Class name: `{class_name}` extending `Scene`
2. Total duration ~{duration}s
3. Include: title card, step-by-step visuals, key terms highlighted,
   FadeIn/Write/Transform transitions, summary card at end
4. Add comments on every animation block
5. Output ONLY the Python script. No explanation. No markdown fences.
6. Must run with: manim -pql script.py {class_name}
7. Import line: from manim import *

ABSOLUTE RULES — the script MUST follow ALL of these or it will crash:
- Use ONLY Text() for ALL text. NEVER use MathTex, Tex, Code, MarkupText, or Paragraph.
- For bold: Text("...", weight=BOLD)
- For size: Text("...", font_size=36)
- For color: Text("...", color=BLUE)
- For code snippets: use Text("code here", font_size=24, color=YELLOW) inside a RoundedRectangle
- NEVER use ImageMobject, SVGMobject, or reference any external file (.png/.jpg/.svg/.gif)
- NEVER use Code() — it requires file I/O and will crash
- NEVER use Table() — it has compatibility issues
- ALLOWED objects: Text, Circle, Square, Rectangle, RoundedRectangle, Arrow, Line,
  VGroup, Dot, Brace, SurroundingRectangle, Polygon, Star, DashedLine, CurvedArrow,
  DoubleArrow, Triangle, Ellipse, Annulus, Arc, AnnularSector, Sector
- ALLOWED animations: FadeIn, FadeOut, Write, Create, Uncreate, Transform,
  ReplacementTransform, GrowFromCenter, GrowArrow, Indicate, Flash, Circumscribe,
  MoveToTarget, ApplyMethod, AnimationGroup, Succession, LaggedStart
- ALLOWED colors: RED, BLUE, GREEN, YELLOW, WHITE, ORANGE, PURPLE, GRAY, TEAL, GOLD, PINK, MAROON
- All animations: self.play(...) or self.wait(...)
- Every variable you use MUST be defined. Never reference an undefined variable."""

_HEATMAP_LP_PROMPT = """You are an adaptive learning designer.

Doubt Heatmap (topic → struggle frequency):
{heatmap}

Doubts summary:
{doubts}

Create a Mermaid `flowchart TD` remedial learning path:
  • Most-struggled topics at top
  • Prerequisite concepts shown with arrows
  • Specific subtopics to review as leaf nodes
  • Mastery Check node at end of each branch
  • Color: fill:#FF6B6B (critical), fill:#FFD93D (moderate), fill:#6BCB77 (light)
  • End with a "Ready to Advance" node

Output ONLY the Mermaid code. No explanation. No fences."""


# ════════════════════════════════════════════════════════════════════════════
#  RAG ENGINE (ChromaDB)
# ════════════════════════════════════════════════════════════════════════════

class RAGEngine:
    def __init__(self, pdf_path, embedding_model=MODEL_EMBED, chunk_size=800, chunk_overlap=150, session_id=None):
        self.pdf_path        = pdf_path
        self.embedding_model = embedding_model
        self.chunk_size      = chunk_size
        self.chunk_overlap   = chunk_overlap
        self.client          = chromadb.Client()
        self.collection_name = "pdf_kb_" + (session_id if session_id else uuid.uuid4().hex)
        self.collection_name = self.collection_name.replace("-", "_")
        self.collection      = self.client.get_or_create_collection(self.collection_name)

    def extract_pages(self):
        doc   = fitz.open(self.pdf_path)
        pages = []
        for i in range(len(doc)):
            text = doc.load_page(i).get_text("text").strip()
            if text:
                pages.append({"page": i + 1, "text": text})
        doc.close()
        return pages

    def chunk_pages(self, pages):
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size, chunk_overlap=self.chunk_overlap)
        chunks = []
        for p in pages:
            for c in splitter.split_text(p["text"]):
                chunks.append({"page": p["page"], "text": c})
        return chunks

    def build(self, progress_callback=None):
        if self.collection.count() > 0:
            return

        pages  = self.extract_pages()
        if progress_callback: progress_callback(10, f"Extracted {len(pages)} pages")

        chunks = self.chunk_pages(pages)
        if progress_callback: progress_callback(15, f"Created {len(chunks)} chunks")

        texts, metas, ids = [], [], []
        for i, c in enumerate(chunks):
            texts.append(c["text"])
            metas.append({"page": c["page"]})
            ids.append(f"chunk_{i}")

        batch_size = 50
        for i in range(0, len(texts), batch_size):
            b_texts = texts[i:i + batch_size]
            b_metas = metas[i:i + batch_size]
            b_ids   = ids[i:i + batch_size]

            res = ollama.embed(model=self.embedding_model, input=b_texts)
            self.collection.add(embeddings=res.embeddings, documents=b_texts, metadatas=b_metas, ids=b_ids)

            if progress_callback:
                pct = 15 + int((i / len(texts)) * 35)
                progress_callback(pct, f"Embedding chunk {i}/{len(texts)}...")

        if progress_callback: progress_callback(50, "Knowledge base built")

    def retrieve(self, query, n=3):
        res = ollama.embed(model=self.embedding_model, input=query)
        results = self.collection.query(query_embeddings=[res.embeddings[0]], n_results=n)
        if not results['documents'] or not results['documents'][0]:
            return []
        
        docs = results['documents'][0]
        metas = results['metadatas'][0]
        return [{"text": d, "page": m.get("page", "?")} for d, m in zip(docs, metas)]

    def all_chunks(self, limit=30):
        res = self.collection.get(limit=limit)
        return [{"text": d, "page": m.get("page", "?")} for d, m in zip(res['documents'], res['metadatas'])]


# ════════════════════════════════════════════════════════════════════════════
#  ROBUST JSON PARSER
# ════════════════════════════════════════════════════════════════════════════

def _fix_backslashes(s: str) -> str:
    VALID_SINGLE = frozenset('"' + '\\' + '/' + 'bfnrt')
    result: list[str] = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch != '\\':
            result.append(ch)
            i += 1
            continue
        if i + 1 >= len(s):
            result.append('\\\\')
            i += 1
            continue
        nxt = s[i + 1]
        if nxt == 'u':
            hex4 = s[i + 2:i + 6]
            if len(hex4) == 4 and all(c in '0123456789abcdefABCDEF' for c in hex4):
                result.append(s[i:i + 6])
                i += 6
                continue
            result.append('\\\\')
            i += 1
            continue
        if nxt in VALID_SINGLE:
            after = s[i + 2] if i + 2 < len(s) else ''
            if nxt in 'bfnrt' and after.isalpha():
                result.append('\\\\')
                i += 1
                continue
            result.append(ch)
            result.append(nxt)
            i += 2
            continue
        result.append('\\\\')
        i += 1
    return ''.join(result)

def _extract_json_block(raw: str) -> str:
    cleaned = re.sub(r'```(?:json)?\s*', '', raw).strip().strip('`').strip()
    start = cleaned.find('{')
    if start == -1: return cleaned
    depth = 0
    for j, ch in enumerate(cleaned[start:], start):
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: return cleaned[start:j + 1]
    return cleaned[start:]

def _fix_missing_commas(s: str) -> str:
    s = re.sub(r'(")\s*\n\s*(")', r'\1,\n\2', s)
    s = re.sub(r'(")\s{2,}("(?:[^"\\]|\\.)*"\s*:)', r'\1, \2', s)
    return s

def _field_fallback(raw: str, q_type: str, difficulty: str) -> dict | None:
    def grab(key: str) -> str | None:
        m = re.search(r'"' + re.escape(key) + r'"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
        return m.group(1) if m else None

    def grab_list(key: str) -> list[str]:
        m = re.search(r'"' + re.escape(key) + r'"\s*:\s*\[(.*?)\]', raw, re.DOTALL)
        if not m: return []
        return re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))

    def grab_int(key: str) -> int | None:
        m = re.search(r'"' + re.escape(key) + r'"\s*:\s*(\d+)', raw)
        return int(m.group(1)) if m else None

    question = grab('question')
    answer   = grab('answer')
    if not question or not answer: return None

    obj: dict = {
        'type':        q_type,
        'difficulty':  difficulty,
        'topic':       grab('topic') or 'General',
        'page_number': grab_int('page_number') or 1,
        'question':    question,
        'answer':      answer,
        'solution':    grab('solution') or '',
    }
    opts = grab_list('options')
    if opts: obj['options'] = opts
    return obj

def safe_parse_json(raw: str, q_type: str = 'mcq', difficulty: str = 'medium') -> dict | None:
    json_block = _extract_json_block(raw)

    for transform in (lambda s: s, _fix_backslashes, lambda s: _fix_backslashes(_fix_missing_commas(s))):
        try:
            return json.loads(transform(json_block))
        except json.JSONDecodeError:
            pass

    m = re.search(r'\{.*\}', raw, re.DOTALL)
    if m:
        try:
            return json.loads(_fix_backslashes(m.group(0)))
        except json.JSONDecodeError:
            pass

    return _field_fallback(raw, q_type, difficulty)


# ════════════════════════════════════════════════════════════════════════════
#  QUIZ GENERATOR
# ════════════════════════════════════════════════════════════════════════════

def _call_model(prompt: str, model: str = MODEL_CHAT, q_type: str = "mcq", difficulty: str = "medium") -> dict | None:
    try:
        res = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.3},
        )
        raw = res["message"]["content"]
    except Exception as e:
        print(f"  ⚠️  model call failed: {e}")
        return None

    return safe_parse_json(raw, q_type=q_type, difficulty=difficulty)

def generate_quiz(rag, output_file: str, rules: dict, progress_callback=None) -> list[dict]:
    output_file = Path(output_file)
    if output_file.exists():
        return json.loads(output_file.read_text())

    q_rules = rules["quiz"]
    total   = q_rules["num_questions"]

    types = [t for t, n in q_rules["type_distribution"].items() for _ in range(n)]
    diffs = [d for d, n in q_rules["difficulty_distribution"].items() for _ in range(n)]
    plan  = [{"type": types[i % len(types)], "difficulty": diffs[i % len(diffs)]} for i in range(total)]

    questions = []
    for i, item in enumerate(plan):
        chunks  = rag.retrieve(
            f"{item['difficulty']} {item['type']} about chapter",
            n=q_rules.get("context_chunks_per_question", 3),
        )
        context = "\n\n".join(c["text"] for c in chunks)[:2000]
        page    = chunks[0]["page"] if chunks else 1
        prompt  = PROMPTS[item["type"]].format(difficulty=item["difficulty"], page=page, context=context)

        if progress_callback:
            pct = 50 + int((i / total) * 50)
            progress_callback(pct, f"Generating question {i+1} of {total}...")

        q = _call_model(prompt, q_type=item["type"], difficulty=item["difficulty"])
        if q:
            q["id"]             = i + 1
            q["context_chunks"] = [c["text"][:300] for c in chunks]
            questions.append(q)

    output_file.write_text(json.dumps(questions, indent=2))
    if progress_callback:
        progress_callback(100, f"Quiz ready — {len(questions)} questions generated")

    return questions


def _default_mermaid(title: str) -> str:
    return f"""flowchart TD
    subgraph Overview
        A[{title}] --> B(Core Concepts)
        A --> C(Practical Applications)
    end
    B --> D[Review Key Topics]
    C --> D
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#ccf,stroke:#333,stroke-width:1px
    style C fill:#ccf,stroke:#333,stroke-width:1px
    style D fill:#90EE90,stroke:#333,stroke-width:2px
"""

def _sanitize_mermaid(script: str, fallback_title="Learning Path") -> str:
    """Validate Mermaid script and return a fallback if it is truncated or malformed."""
    script = script.strip()
    if not script.startswith("flowchart"):
        m = re.search(r"(flowchart\s+\w+.*)", script, re.DOTALL)
        if m:
            script = m.group(1).strip()
        else:
            return _default_mermaid(fallback_title)

    # Check for basic truncation: mismatched brackets/parentheses
    if script.count('[') != script.count(']') or script.count('(') != script.count(')'):
        return _default_mermaid(fallback_title)
        
    # Check if last line seems abruptly cut off (e.g., ends with an arrow or preposition)
    lines = script.splitlines()
    if not lines:
        return _default_mermaid(fallback_title)
    
    last_line = lines[-1].strip()
    if last_line.endswith('-->') or last_line.endswith('of') or last_line.endswith('the') or last_line.endswith(','):
        return _default_mermaid(fallback_title)

    return script

# ════════════════════════════════════════════════════════════════════════════
#  LEARNING PATH GENERATOR
# ════════════════════════════════════════════════════════════════════════════

def generate_learning_path(rag, output_file: str, rules: dict) -> str:
    output_file = Path(output_file)
    if output_file.exists():
        return output_file.read_text()

    model     = rules["learning_path"]["model"]
    direction = rules["learning_path"]["direction"]

    chunks  = rag.all_chunks(limit=30)
    content = "\n\n---\n\n".join(f"[Page {c['page']}] {c['text'][:300]}" for c in chunks[:20])

    res = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": _LP_PROMPT.format(content=content, direction=direction)}],
        options={"temperature": 0.2, "num_predict": 2048}
    )
    raw = res["message"]["content"]

    cleaned = re.sub(r"```(?:mermaid)?", "", raw).strip().rstrip("`").strip()
    cleaned = _sanitize_mermaid(cleaned, "Main Topics")

    output_file.write_text(cleaned)
    return cleaned


# ════════════════════════════════════════════════════════════════════════════
#  DOUBT TRACKER
# ════════════════════════════════════════════════════════════════════════════

class DoubtTracker:
    def __init__(self, output_file: str, rag=None, solution_model=MODEL_LP):
        self.output_file = Path(output_file)
        self.rag = rag
        self.solution_model = solution_model
        self.doubts = []
        if self.output_file.exists():
            self.doubts = json.loads(self.output_file.read_text())

    def log(self, content, topic="General", dtype="question", qid=None, user_ans=None, correct_ans=None):
        for d in self.doubts:
            if d["content"] == content:
                d["frequency"] += 1
                self._save()
                return d

        solution = self._solve(content, topic)
        entry = {
            "id": len(self.doubts) + 1,
            "type": dtype,
            "content": content,
            "topic": topic,
            "question_id": qid,
            "user_answer": user_ans,
            "correct_answer": correct_ans,
            "frequency": 1,
            "ai_solution": solution,
        }
        self.doubts.append(entry)
        self._save()
        return entry

    def log_wrong(self, q, user_ans):
        content = (f"Wrong answer on: {q.get('question','')}\n"
                   f"User: {user_ans}  |  Correct: {q.get('answer','')}")
        return self.log(
            content=content,
            topic=q.get("topic", "Unknown"),
            dtype="wrong_answer",
            qid=q.get("id"),
            user_ans=user_ans,
            correct_ans=q.get("answer")
        )

    def _solve(self, doubt, topic):
        ctx = ""
        if self.rag:
            cs  = self.rag.retrieve(doubt, n=2)
            ctx = "\nContext:\n" + "\n".join(c["text"][:300] for c in cs)
        prompt = (f"You are an expert AI & DS tutor. Explain clearly.\n"
                  f"Topic: {topic}\nDoubt: {doubt}{ctx}")
        try:
            res = ollama.chat(model=self.solution_model, messages=[{"role": "user", "content": prompt}], options={"temperature": 0.3})
            return res["message"]["content"]
        except Exception:
            return "Solution generation failed."

    def _save(self):
        self.output_file.write_text(json.dumps(self.doubts, indent=2))

    def heatmap(self):
        c = Counter()
        for d in self.doubts:
            c[d.get("topic", "Unknown")] += d.get("frequency", 1)
        return dict(c.most_common())


# ════════════════════════════════════════════════════════════════════════════
#  HEATMAP LEARNING PATH
# ════════════════════════════════════════════════════════════════════════════

def generate_heatmap_lp(tracker: DoubtTracker, output_file: str, rules: dict) -> str:
    output_file = Path(output_file)
    if output_file.exists():
        return output_file.read_text()

    hm = tracker.heatmap()
    if not tracker.doubts:
        return ""

    hm_str = "\n".join(f"  {t}: {f}x" for t, f in hm.items())
    d_str  = "".join(
        f"\n[{d['type'].upper()}] {d['topic']} | freq={d['frequency']}\n  → {d['content'][:100]}\n"
        for d in sorted(tracker.doubts, key=lambda x: x["frequency"], reverse=True)[:12])

    res = ollama.chat(
        model=rules["heatmap"]["model"],
        messages=[{"role": "user", "content": _HEATMAP_LP_PROMPT.format(heatmap=hm_str, doubts=d_str)}],
        options={"temperature": 0.2, "num_predict": 2048}
    )
    raw = res["message"]["content"]

    cleaned = re.sub(r"```(?:mermaid)?", "", raw).strip().rstrip("`").strip()
    cleaned = _sanitize_mermaid(cleaned, "Struggle Areas Remediation")

    output_file.write_text(cleaned)
    return cleaned


# ════════════════════════════════════════════════════════════════════════════
#  MANIM SCRIPT SANITIZER
# ════════════════════════════════════════════════════════════════════════════

def _sanitize_manim_script(script: str) -> str:
    """
    Post-process AI-generated Manim scripts to prevent runtime crashes.
    
    Strategy: REPLACE problematic constructors with safe alternatives
    instead of deleting lines (which creates dangling NameErrors).
    """
    # ── 1. Replace dangerous constructors with safe alternatives ──
    # ImageMobject("anything.png") → Square(side_length=0.8, color=BLUE)
    script = re.sub(
        r'ImageMobject\s*\([^)]*\)(\s*\.[\w.()]*)*',
        'Square(side_length=0.8, color=BLUE)',
        script
    )
    # SVGMobject("anything.svg") → Circle(radius=0.4, color=TEAL)
    script = re.sub(
        r'SVGMobject\s*\([^)]*\)(\s*\.[\w.()]*)*',
        'Circle(radius=0.4, color=TEAL)',
        script
    )
    # Code(code="...", ...) → Text("code", font_size=20, color=YELLOW)
    script = re.sub(
        r'Code\s*\([^)]*\)',
        'Text("(code snippet)", font_size=20, color=YELLOW)',
        script
    )
    # Table(...) → Text("(table)", font_size=20, color=WHITE)
    script = re.sub(
        r'\bTable\s*\([^)]*\)',
        'Text("(table)", font_size=20, color=WHITE)',
        script
    )

    # ── 2. Convert MathTex/Tex to Text ──
    script = re.sub(r'\bMathTex\s*\(', 'Text(', script)
    script = re.sub(r'\bTex\s*\(', 'Text(', script)
    script = re.sub(r'\bMarkupText\s*\(', 'Text(', script)
    script = re.sub(r'\bParagraph\s*\(', 'Text(', script)

    # ── 3. Clean LaTeX inside Text() string arguments ──
    def _clean_latex_string(s: str) -> str:
        """Strip LaTeX commands from a string, converting to Unicode."""
        s = re.sub(r'\\textbf\{([^}]*)\}', r'\1', s)
        s = re.sub(r'\\textit\{([^}]*)\}', r'\1', s)
        s = re.sub(r'\\text\{([^}]*)\}', r'\1', s)
        s = re.sub(r'\\mathrm\{([^}]*)\}', r'\1', s)
        s = re.sub(r'\\mathbf\{([^}]*)\}', r'\1', s)
        s = re.sub(r'\\frac\{([^}]*)\}\{([^}]*)\}', r'\1/\2', s)
        s = re.sub(r'\\sqrt\{([^}]*)\}', r'√\1', s)
        s = re.sub(r'\\times', '×', s)
        s = re.sub(r'\\cdot', '·', s)
        s = re.sub(r'\\rightarrow', '→', s)
        s = re.sub(r'\\leftarrow', '←', s)
        s = re.sub(r'\\infty', '∞', s)
        s = re.sub(r'\\sum', 'Σ', s)
        s = re.sub(r'\\pi', 'π', s)
        s = re.sub(r'\\alpha', 'α', s)
        s = re.sub(r'\\beta', 'β', s)
        s = re.sub(r'\\gamma', 'γ', s)
        s = re.sub(r'\\theta', 'θ', s)
        s = re.sub(r'\\lambda', 'λ', s)
        s = re.sub(r'\\Delta', 'Δ', s)
        s = re.sub(r'\\[a-zA-Z]+', '', s)  # strip remaining \commands
        s = re.sub(r'[{}]', '', s)  # strip stray braces
        return s.strip() or "..."

    def _replace_latex_in_text_call(m):
        prefix = m.group(1)  # "Text(" part
        quote_char = m.group(2)  # opening quote
        raw_prefix = m.group(3) or ""  # "r" if raw string
        content = m.group(4)  # string content
        end_quote = m.group(5)  # closing quote
        cleaned = _clean_latex_string(content)
        return f'{prefix}"{cleaned}"'

    # Match Text(r"...", ...) and Text("...", ...)
    script = re.sub(
        r'(Text\(\s*)([\"\'])(r?)((?:[^\"\'\\]|\\.)*)([\"\'])',
        _replace_latex_in_text_call,
        script
    )
    # Also handle Text(r'...')
    script = re.sub(
        r"(Text\(\s*)(r)(['\"])((?:[^'\"\\]|\\.)*)['\"]",
        lambda m: f'{m.group(1)}"{_clean_latex_string(m.group(4))}"',
        script
    )

    # ── 4. Remove stray file references in remaining strings ──
    script = re.sub(r'["\'][^"\']*\.(png|jpg|jpeg|gif|ico|svg)["\']', '"placeholder"', script)

    # ── 5. Ensure the import line is present ──
    if 'from manim import' not in script:
        script = 'from manim import *\n\n' + script

    return script


# ════════════════════════════════════════════════════════════════════════════
#  VIDEO SCRIPT GENERATOR
# ════════════════════════════════════════════════════════════════════════════

def generate_video_script(q: dict, vid_dir: Path, rules: dict) -> dict:
    from manim_validator import validate_and_fix

    vid_dir = Path(vid_dir)
    vid_dir.mkdir(parents=True, exist_ok=True)
    
    qid = q.get("id", 0)
    raw_topic = q.get("topic", "") or ""
    # Sanitize topic: reject LLM placeholders like "<short name>"
    if not raw_topic or "<" in raw_topic or raw_topic.strip() == "":
        # Fall back to first 40 chars of the question
        raw_topic = q.get("question", "Concept")[:40]
    topic = raw_topic.strip()
    slug = re.sub(r"[^a-z0-9]", "_", topic.lower())[:30].strip("_")
    
    meta_file = vid_dir / f"q{qid}_{slug}_meta.json"
    if meta_file.exists():
        return json.loads(meta_file.read_text())

    model    = rules["video"]["model"]
    duration = rules["video"]["duration_seconds"]
    cname    = f"Q{qid}_{re.sub(r'[^a-zA-Z0-9]', '', topic)[:18]}"

    prompt   = _MANIM_PROMPT.format(
        question=q.get("question", ""),
        answer=q.get("answer", ""),
        solution=q.get("solution", "")[:600],
        context=" ".join(q.get("context_chunks", []))[:400],
        topic=topic, class_name=cname, duration=duration)

    res = ollama.chat(model=model, messages=[{"role": "user", "content": prompt}], options={"temperature": 0.1, "num_predict": 3000})
    raw = res["message"]["content"]
    
    match = re.search(r"```(?:python)?(.*?)```", raw, re.DOTALL)
    if match:
        script = match.group(1).strip()
    else:
        script = re.sub(r"```(?:python)?", "", raw).strip().rstrip("`").strip()

    # ── Validate, repair, and guarantee the script works ──
    py_file = vid_dir / f"q{qid}_{slug}_manim.py"
    script, success, logs = validate_and_fix(
        script=script,
        script_path=py_file,
        class_name=cname,
        topic=topic,
        question=q.get("question", ""),
        answer=q.get("answer", ""),
        solution=q.get("solution", ""),
    )
    for log_line in logs:
        print(f"  [validator Q{qid}] {log_line}")

    py_file.write_text(script)

    meta = {
        "question_id": qid,
        "topic":       topic,
        "class_name":  cname,
        "run_command": f"manim -pql {py_file.name} {cname}",
        "script_file": str(py_file),
    }
    meta_file.write_text(json.dumps(meta, indent=2))
    return meta
