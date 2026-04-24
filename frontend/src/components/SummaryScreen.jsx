import useQuizStore from '../store/useQuizStore';
import QuestionSummaryRow from './QuestionSummaryRow';

export default function SummaryScreen() {
  const { questions, answers, score, reset, setScreen, setQuestions, pdfName } = useQuizStore();

  const total = questions.length;
  const answered = Object.keys(answers).length;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  // Score ring dimensions
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (accuracy / 100) * circumference;

  const getScoreColor = () => {
    if (accuracy >= 80) return { stroke: '#2D8B5F', text: 'text-success', label: 'Excellent!' };
    if (accuracy >= 60) return { stroke: '#D4A030', text: 'text-warning', label: 'Good work!' };
    return { stroke: '#C4443C', text: 'text-error', label: 'Keep practicing!' };
  };

  const scoreStyle = getScoreColor();

  const handleRetake = () => {
    const store = useQuizStore.getState();
    store.setQuestions(store.questions);
    store.setScreen('quiz');
  };

  return (
    <div className="animate-fade-in">
      {/* Score hero */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-bold text-navy mb-6">Quiz Complete</h2>

        {/* Score ring */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <svg width="140" height="140" className="-rotate-90">
            <circle
              cx="70" cy="70" r={radius}
              stroke="#E5E7EB" strokeWidth="8" fill="none"
            />
            <circle
              cx="70" cy="70" r={radius}
              stroke={scoreStyle.stroke}
              strokeWidth="8" fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${scoreStyle.text}`}>{accuracy}%</span>
            <span className="text-xs text-muted">{score}/{total}</span>
          </div>
        </div>

        <p className={`text-lg font-semibold ${scoreStyle.text}`}>{scoreStyle.label}</p>
        <p className="text-sm text-muted mt-1">
          {pdfName && `Based on ${pdfName}`}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Questions', value: total, icon: '📝' },
          { label: 'Correct', value: score, icon: '✅' },
          { label: 'Incorrect', value: total - score, icon: '❌' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 text-center">
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-2xl font-bold text-navy mt-1">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Per-question summary */}
      <div className="space-y-3 mb-8">
        <h3 className="text-lg font-semibold text-navy">Question Details</h3>
        {questions.map((q) => (
          <QuestionSummaryRow
            key={q.id}
            question={q}
            answer={answers[q.id]}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleRetake} className="btn-secondary flex-1">
          🔄 Retake Quiz
        </button>
        <button
          onClick={() => setScreen('learningPath')}
          className="btn-secondary flex-1"
        >
          🗺️ View Learning Path
        </button>
        <button onClick={reset} className="btn-primary flex-1">
          📄 New PDF
        </button>
      </div>
    </div>
  );
}
