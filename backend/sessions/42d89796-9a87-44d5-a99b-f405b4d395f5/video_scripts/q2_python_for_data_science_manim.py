from manim import *

class Q2_PythonforDataScien(Scene):
    def construct(self):
        # ── Title card ──
        title = Text("Python for Data Science", font_size=40, color=BLUE, weight=BOLD)
        underline = Line(LEFT * 3, RIGHT * 3, color=BLUE).next_to(title, DOWN, buff=0.2)
        self.play(Write(title), Create(underline))
        self.wait(1.5)

        # ── Question ──
        self.play(FadeOut(title), FadeOut(underline))
        q_label = Text("Question", font_size=30, color=YELLOW, weight=BOLD).to_edge(UP)
        q_text = Text("What is a key skill of the student?", font_size=22, color=WHITE).next_to(q_label, DOWN, buff=0.5)
        q_box = SurroundingRectangle(q_text, color=YELLOW, buff=0.3, corner_radius=0.1)
        self.play(Write(q_label), FadeIn(q_text), Create(q_box))
        self.wait(2)

        # ── Answer reveal ──
        self.play(FadeOut(q_label), FadeOut(q_text), FadeOut(q_box))
        a_label = Text("Answer", font_size=30, color=GREEN, weight=BOLD).to_edge(UP)
        a_text = Text("A", font_size=28, color=GREEN)
        a_box = SurroundingRectangle(a_text, color=GREEN, buff=0.3, corner_radius=0.1)
        self.play(Write(a_label))
        self.play(FadeIn(a_text), Create(a_box))
        self.wait(2)

        # ── Explanation ──
        self.play(FadeOut(a_label), FadeOut(a_text), FadeOut(a_box))
        e_label = Text("Explanation", font_size=30, color=TEAL, weight=BOLD).to_edge(UP)
        explanation = VGroup(
            Text("The student's key skill is Python, which is", font_size=20, color=WHITE),
            Text("central to data science. Python is widely", font_size=20, color=WHITE),
            Text("used for data analysis, machine learning, and", font_size=20, color=WHITE),
            Text("data visualization, making it a critical", font_size=20, color=WHITE),
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        self.play(Write(e_label))
        self.play(FadeIn(explanation, shift=UP * 0.3))
        self.wait(3)

        # ── Summary card ──
        self.play(FadeOut(e_label), FadeOut(explanation))
        summary = VGroup(
            Text("Key Takeaway", font_size=28, color=GOLD, weight=BOLD),
            Text("A", font_size=22, color=WHITE),
        ).arrange(DOWN, buff=0.4)
        box = SurroundingRectangle(summary, color=GOLD, buff=0.4, corner_radius=0.15)
        self.play(FadeIn(summary), Create(box))
        self.wait(2)
        self.play(FadeOut(summary), FadeOut(box))
