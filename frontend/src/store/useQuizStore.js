import { create } from 'zustand';

const useQuizStore = create((set, get) => ({
  // ── Session ───────────────────────────────────────────────────────
  sessionId: null,
  pdfName: null,

  // ── Processing status ─────────────────────────────────────────────
  stage: null,       // "extracting" | "embedding" | "generating_questions" | "ready"
  progress: 0,       // 0–100
  statusMessage: '',

  // ── Quiz data ─────────────────────────────────────────────────────
  questions: [],
  currentIndex: 0,

  // ── Answers & scoring ─────────────────────────────────────────────
  answers: {},        // { [questionId]: { userAnswer, isCorrect, correctAnswer, solution } }
  score: 0,

  // ── Chat histories per question ───────────────────────────────────
  chatHistories: {},  // { [questionId]: [{ role, content }] }

  // ── Screen navigation ─────────────────────────────────────────────
  screen: 'upload',  // "upload" | "quiz" | "learningPath" | "summary"

  // ── Learning path ─────────────────────────────────────────────────
  learningPathMermaid: null,
  showHeatmap: false,
  heatmapMermaid: null,

  // ── Actions ───────────────────────────────────────────────────────

  setSession: (sessionId, pdfName) => set({ sessionId, pdfName }),

  setStatus: (stage, progress, message) => set({
    stage,
    progress,
    statusMessage: message,
  }),

  setQuestions: (questions) => set({
    questions,
    currentIndex: 0,
    answers: {},
    score: 0,
    chatHistories: {},
  }),

  setScreen: (screen) => set({ screen }),

  submitAnswer: (questionId, userAnswer, isCorrect, correctAnswer, solution) => {
    const prev = get().answers;
    const wasAlreadyAnswered = prev[questionId] !== undefined;
    const newScore = get().score + (isCorrect && !wasAlreadyAnswered ? 1 : 0);

    set({
      answers: {
        ...prev,
        [questionId]: { userAnswer, isCorrect, correctAnswer, solution },
      },
      score: newScore,
    });
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    } else {
      set({ screen: 'summary' });
    }
  },

  prevQuestion: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  addChatMessage: (questionId, message) => {
    const histories = { ...get().chatHistories };
    if (!histories[questionId]) {
      histories[questionId] = [];
    }
    histories[questionId] = [...histories[questionId], message];
    set({ chatHistories: histories });
  },

  updateLastChatMessage: (questionId, token) => {
    const histories = { ...get().chatHistories };
    const msgs = histories[questionId] || [];
    if (msgs.length > 0) {
      const last = { ...msgs[msgs.length - 1] };
      last.content += token;
      histories[questionId] = [...msgs.slice(0, -1), last];
      set({ chatHistories: histories });
    }
  },

  setLearningPath: (mermaid) => set({ learningPathMermaid: mermaid }),
  setHeatmapPath: (mermaid) => set({ heatmapMermaid: mermaid }),
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),

  reset: () => set({
    sessionId: null,
    pdfName: null,
    stage: null,
    progress: 0,
    statusMessage: '',
    questions: [],
    currentIndex: 0,
    answers: {},
    score: 0,
    chatHistories: {},
    screen: 'upload',
    learningPathMermaid: null,
    showHeatmap: false,
    heatmapMermaid: null,
  }),
}));

export default useQuizStore;
