import useQuizStore from './store/useQuizStore';
import UploadScreen from './components/UploadScreen';
import QuizScreen from './components/QuizScreen';
import LearningPathPanel from './components/LearningPathPanel';
import SummaryScreen from './components/SummaryScreen';

function App() {
  const screen = useQuizStore((s) => s.screen);

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              const store = useQuizStore.getState();
              if (store.screen !== 'upload') {
                if (confirm('Return to home? Current progress will be lost.')) {
                  store.reset();
                }
              }
            }}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <span className="text-navy font-semibold text-lg tracking-tight">
              AI Tutor
            </span>
          </button>

          {screen === 'quiz' && (
            <nav className="flex items-center gap-1">
              <button
                onClick={() => useQuizStore.getState().setScreen('quiz')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  screen === 'quiz'
                    ? 'bg-navy-50 text-navy'
                    : 'text-muted hover:text-navy'
                }`}
              >
                Quiz
              </button>
              <button
                onClick={() => useQuizStore.getState().setScreen('learningPath')}
                className="px-3 py-1.5 text-sm font-medium rounded-md text-muted hover:text-navy transition-colors"
              >
                Learning Path
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {screen === 'upload' && <UploadScreen />}
        {screen === 'quiz' && <QuizScreen />}
        {screen === 'learningPath' && <LearningPathPanel />}
        {screen === 'summary' && <SummaryScreen />}
      </main>
    </div>
  );
}

export default App;
