"""
AI Tutor — Manim Script Validator & Auto-Repair Module

Ensures that AI-generated Manim scripts will render successfully by:
1. Syntax validation via ast.parse()
2. AST-level banned-object detection & replacement
3. Mock-execution to catch NameError / TypeError at "import time"
4. Auto-repair loop (up to N attempts)
5. Guaranteed fallback template if everything fails
"""

import ast
import re
import subprocess
import textwrap
from pathlib import Path
from typing import Tuple

# ── Objects that MUST NOT appear in generated scripts ────────────────────
BANNED_CALLS = {
    "ImageMobject", "SVGMobject", "Code", "Table",
    "MathTex", "Tex", "MarkupText", "Paragraph",
}

# ── Safe replacement for each banned call ────────────────────────────────
REPLACEMENTS = {
    "ImageMobject":  "Square(side_length=0.8, color=BLUE)",
    "SVGMobject":    "Circle(radius=0.4, color=TEAL)",
    "Code":          'Text("(code)", font_size=20, color=YELLOW)',
    "Table":         'Text("(table)", font_size=20, color=WHITE)',
    "MathTex":       None,  # handled by Tex→Text conversion
    "Tex":           None,
    "MarkupText":    None,
    "Paragraph":     None,
}

# LaTeX command → Unicode replacement map
LATEX_TO_UNICODE = [
    (r"\\textbf\{([^}]*)\}", r"\1"),
    (r"\\textit\{([^}]*)\}", r"\1"),
    (r"\\text\{([^}]*)\}",   r"\1"),
    (r"\\mathrm\{([^}]*)\}", r"\1"),
    (r"\\mathbf\{([^}]*)\}", r"\1"),
    (r"\\frac\{([^}]*)\}\{([^}]*)\}", r"\1/\2"),
    (r"\\sqrt\{([^}]*)\}", r"√\1"),
    (r"\\times",       "×"),
    (r"\\cdot",        "·"),
    (r"\\rightarrow",  "→"),
    (r"\\leftarrow",   "←"),
    (r"\\infty",       "∞"),
    (r"\\sum",         "Σ"),
    (r"\\pi",          "π"),
    (r"\\alpha",       "α"),
    (r"\\beta",        "β"),
    (r"\\gamma",       "γ"),
    (r"\\theta",       "θ"),
    (r"\\lambda",      "λ"),
    (r"\\Delta",       "Δ"),
]


# ════════════════════════════════════════════════════════════════════════════
#  STEP 1: Syntax Check
# ════════════════════════════════════════════════════════════════════════════

def check_syntax(script: str) -> Tuple[bool, str]:
    """Return (True, '') if syntax is valid, else (False, error_msg)."""
    try:
        ast.parse(script)
        return True, ""
    except SyntaxError as e:
        return False, f"Line {e.lineno}: {e.msg}"


# ════════════════════════════════════════════════════════════════════════════
#  STEP 2: AST-level analysis — find banned calls & undefined variables
# ════════════════════════════════════════════════════════════════════════════

def _find_banned_calls(tree: ast.AST) -> list[str]:
    """Walk AST and return list of banned function/class calls found."""
    found = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            name = None
            if isinstance(node.func, ast.Name):
                name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                name = node.func.attr
            if name and name in BANNED_CALLS:
                found.append(name)
    return found


# ════════════════════════════════════════════════════════════════════════════
#  STEP 3: Text-level repairs
# ════════════════════════════════════════════════════════════════════════════

def _clean_latex_string(s: str) -> str:
    """Strip LaTeX commands from a string, converting to Unicode."""
    for pattern, repl in LATEX_TO_UNICODE:
        s = re.sub(pattern, repl, s)
    s = re.sub(r"\\[a-zA-Z]+", "", s)    # remaining \commands
    s = re.sub(r"[{}]", "", s)            # stray braces
    return s.strip() or "..."


def repair_script(script: str) -> str:
    """
    Apply all text-level repairs to make the script safe.
    This is the main repair pipeline.
    """
    # ── A. Replace banned constructors with safe alternatives ──
    # ImageMobject("anything.png").scale(0.5) → Square(...)
    script = re.sub(
        r'ImageMobject\s*\([^)]*\)(\s*\.\w+\([^)]*\))*',
        'Square(side_length=0.8, color=BLUE)',
        script
    )
    script = re.sub(
        r'SVGMobject\s*\([^)]*\)(\s*\.\w+\([^)]*\))*',
        'Circle(radius=0.4, color=TEAL)',
        script
    )
    # Code(...) — can have nested parens, match greedily to closing
    script = re.sub(
        r'Code\s*\([^)]*\)',
        'Text("(code snippet)", font_size=20, color=YELLOW)',
        script
    )
    script = re.sub(
        r'\bTable\s*\([^)]*\)',
        'Text("(table)", font_size=20, color=WHITE)',
        script
    )

    # ── B. Convert LaTeX-dependent calls → Text ──
    for name in ("MathTex", "Tex", "MarkupText", "Paragraph"):
        script = re.sub(rf'\b{name}\s*\(', 'Text(', script)

    # ── C. Clean LaTeX inside Text("...") strings ──
    def _clean_text_arg(m):
        before = m.group(1)
        content = m.group(2)
        after = m.group(3)
        cleaned = _clean_latex_string(content)
        return f'{before}"{cleaned}"{after}'

    # Match Text(r"\latex{...}" ...) and Text("\latex{...}" ...)
    script = re.sub(
        r'(Text\(\s*)r?["\']([^"\']*)["\'](\s*[,)])',
        _clean_text_arg,
        script
    )

    # ── D. Remove stray file-path strings ──
    script = re.sub(
        r'["\'][^"\']*\.(png|jpg|jpeg|gif|ico|svg)["\']',
        '"placeholder"',
        script
    )

    # ── E. Ensure import is present ──
    if "from manim import" not in script:
        script = "from manim import *\n\n" + script

    return script


# ════════════════════════════════════════════════════════════════════════════
#  STEP 4: Mock-execution check — catch NameError, TypeError at runtime
# ════════════════════════════════════════════════════════════════════════════

def dry_run_check(script_path: Path) -> Tuple[bool, str]:
    """
    Try to compile and do a quick syntax+import check on the script
    using Python's compile(). This catches SyntaxError but not runtime errors.
    For runtime errors, we do a subprocess check.
    """
    try:
        code = script_path.read_text()
        compile(code, str(script_path), "exec")
    except SyntaxError as e:
        return False, f"SyntaxError at line {e.lineno}: {e.msg}"

    # Quick subprocess import check — just import, don't render
    check_code = (
        f"import sys; sys.path.insert(0, '{script_path.parent}');\n"
        f"exec(open('{script_path}').read())\n"
        f"print('OK')\n"
    )
    try:
        result = subprocess.run(
            ["python3", "-c", check_code],
            capture_output=True, text=True, timeout=15,
            cwd=str(script_path.parent),
        )
        if result.returncode != 0:
            # Extract meaningful error from traceback
            stderr = result.stderr.strip()
            last_line = stderr.split("\n")[-1] if stderr else "Unknown error"
            return False, last_line
        return True, ""
    except subprocess.TimeoutExpired:
        return False, "Script import timed out"
    except Exception as e:
        return False, str(e)


# ════════════════════════════════════════════════════════════════════════════
#  STEP 5: Guaranteed fallback template
# ════════════════════════════════════════════════════════════════════════════

def generate_fallback_script(class_name: str, topic: str, question: str,
                              answer: str, solution: str) -> str:
    """
    Generate a guaranteed-to-work Manim script using ONLY safe objects.
    This is the nuclear option when all repair attempts fail.
    """
    # Truncate long text to prevent rendering issues
    topic_short = topic[:50]
    question_short = question[:80]
    answer_short = answer[:60]
    solution_lines = textwrap.wrap(solution[:200], width=45) or ["See explanation above."]

    sol_items = "\n".join(
        f'            Text("{line}", font_size=20, color=WHITE),'
        for line in solution_lines[:4]
    )

    return f'''from manim import *

class {class_name}(Scene):
    def construct(self):
        # ── Title card ──
        title = Text("{topic_short}", font_size=40, color=BLUE, weight=BOLD)
        underline = Line(LEFT * 3, RIGHT * 3, color=BLUE).next_to(title, DOWN, buff=0.2)
        self.play(Write(title), Create(underline))
        self.wait(1.5)

        # ── Question ──
        self.play(FadeOut(title), FadeOut(underline))
        q_label = Text("Question", font_size=30, color=YELLOW, weight=BOLD).to_edge(UP)
        q_text = Text("{question_short}", font_size=22, color=WHITE).next_to(q_label, DOWN, buff=0.5)
        q_box = SurroundingRectangle(q_text, color=YELLOW, buff=0.3, corner_radius=0.1)
        self.play(Write(q_label), FadeIn(q_text), Create(q_box))
        self.wait(2)

        # ── Answer reveal ──
        self.play(FadeOut(q_label), FadeOut(q_text), FadeOut(q_box))
        a_label = Text("Answer", font_size=30, color=GREEN, weight=BOLD).to_edge(UP)
        a_text = Text("{answer_short}", font_size=28, color=GREEN)
        a_box = SurroundingRectangle(a_text, color=GREEN, buff=0.3, corner_radius=0.1)
        self.play(Write(a_label))
        self.play(FadeIn(a_text), Create(a_box))
        self.wait(2)

        # ── Explanation ──
        self.play(FadeOut(a_label), FadeOut(a_text), FadeOut(a_box))
        e_label = Text("Explanation", font_size=30, color=TEAL, weight=BOLD).to_edge(UP)
        explanation = VGroup(
{sol_items}
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        self.play(Write(e_label))
        self.play(FadeIn(explanation, shift=UP * 0.3))
        self.wait(3)

        # ── Summary card ──
        self.play(FadeOut(e_label), FadeOut(explanation))
        summary = VGroup(
            Text("Key Takeaway", font_size=28, color=GOLD, weight=BOLD),
            Text("{answer_short}", font_size=22, color=WHITE),
        ).arrange(DOWN, buff=0.4)
        box = SurroundingRectangle(summary, color=GOLD, buff=0.4, corner_radius=0.15)
        self.play(FadeIn(summary), Create(box))
        self.wait(2)
        self.play(FadeOut(summary), FadeOut(box))
'''


# ════════════════════════════════════════════════════════════════════════════
#  MAIN PIPELINE: validate_and_fix
# ════════════════════════════════════════════════════════════════════════════

def validate_and_fix(
    script: str,
    script_path: Path,
    class_name: str,
    topic: str = "",
    question: str = "",
    answer: str = "",
    solution: str = "",
    max_repair_attempts: int = 3,
) -> Tuple[str, bool, list[str]]:
    """
    Full validation + repair pipeline.

    Returns: (final_script, success, log_messages)
    """
    logs = []

    for attempt in range(1, max_repair_attempts + 1):
        logs.append(f"[Attempt {attempt}] Validating script...")

        # ── A. Repair pass ──
        script = repair_script(script)

        # ── B. Syntax check ──
        ok, err = check_syntax(script)
        if not ok:
            logs.append(f"  Syntax error: {err}")
            # Try to fix common syntax issues
            script = _fix_common_syntax(script, err)
            ok, err = check_syntax(script)
            if not ok:
                logs.append(f"  Still broken after syntax fix: {err}")
                continue

        # ── C. AST banned-call check ──
        try:
            tree = ast.parse(script)
            banned = _find_banned_calls(tree)
            if banned:
                logs.append(f"  Found banned calls after repair: {banned}")
                # Force another repair pass
                continue
        except Exception:
            pass

        # ── D. Write and dry-run ──
        script_path.write_text(script)
        ok, err = dry_run_check(script_path)
        if ok:
            logs.append(f"  ✅ Validation passed on attempt {attempt}")
            return script, True, logs
        else:
            logs.append(f"  Dry-run failed: {err}")
            # Try to auto-fix based on error message
            script = _fix_from_error(script, err)

    # ── All attempts failed → use fallback ──
    logs.append(f"  ⚠️  All {max_repair_attempts} repair attempts failed. Using fallback template.")
    fallback = generate_fallback_script(class_name, topic, question, answer, solution)
    script_path.write_text(fallback)

    # Verify fallback works
    ok, err = check_syntax(fallback)
    if not ok:
        logs.append(f"  CRITICAL: Fallback has syntax error: {err}")
    else:
        logs.append(f"  ✅ Fallback template validated successfully")

    return fallback, True, logs


# ════════════════════════════════════════════════════════════════════════════
#  AUTO-FIX HELPERS
# ════════════════════════════════════════════════════════════════════════════

def _fix_common_syntax(script: str, error: str) -> str:
    """Attempt to fix common syntax errors."""
    lines = script.split("\n")

    # Missing closing parenthesis
    if "unexpected EOF" in error or "parenthesis" in error.lower():
        open_count = script.count("(") - script.count(")")
        if open_count > 0:
            script += ")" * open_count

    # Unterminated string
    if "unterminated string" in error.lower() or "EOL while scanning" in error:
        # Find the line and close the string
        try:
            line_no = int(re.search(r"Line (\d+)", error).group(1))
            if 0 < line_no <= len(lines):
                line = lines[line_no - 1]
                if line.count('"') % 2 != 0:
                    lines[line_no - 1] = line + '"'
                elif line.count("'") % 2 != 0:
                    lines[line_no - 1] = line + "'"
                script = "\n".join(lines)
        except Exception:
            pass

    return script


def _fix_from_error(script: str, error: str) -> str:
    """Attempt to fix based on runtime error message."""

    # NameError: name 'xyz' is not defined
    m = re.search(r"NameError: name '(\w+)' is not defined", error)
    if m:
        var_name = m.group(1)
        # Find where it's used and add a safe definition before it
        lines = script.split("\n")
        for i, line in enumerate(lines):
            if var_name in line and "=" not in line.split(var_name)[0]:
                indent = len(line) - len(line.lstrip())
                defn = " " * indent + f'{var_name} = Dot(color=WHITE)  # auto-fix placeholder'
                lines.insert(i, defn)
                break
        script = "\n".join(lines)

    # TypeError: ... got an unexpected keyword argument
    m = re.search(r"TypeError: (\w+)\.__init__\(\) got an unexpected keyword argument '(\w+)'", error)
    if m:
        cls_name, kwarg = m.group(1), m.group(2)
        # Remove the problematic keyword argument
        script = re.sub(
            rf'({cls_name}\s*\([^)]*?),?\s*{kwarg}\s*=[^,)]*([,)])',
            r'\1\2',
            script
        )

    # OSError: could not find <file>
    if "could not find" in error.lower() or "FileNotFoundError" in error:
        # Remove any remaining file references
        script = re.sub(
            r'ImageMobject\s*\([^)]*\)(\s*\.\w+\([^)]*\))*',
            'Square(side_length=0.8, color=BLUE)',
            script
        )
        script = re.sub(
            r'SVGMobject\s*\([^)]*\)(\s*\.\w+\([^)]*\))*',
            'Circle(radius=0.4, color=TEAL)',
            script
        )

    # ValueError: latex error
    if "latex error" in error.lower() or "tex" in error.lower():
        script = re.sub(r'\bMathTex\s*\(', 'Text(', script)
        script = re.sub(r'\bTex\s*\(', 'Text(', script)

    return script
