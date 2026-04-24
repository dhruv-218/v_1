import useQuizStore from '../store/useQuizStore';
import QuestionCard from './QuestionCard';

export default function QuizScreen() {
  const { questions, currentIndex } = useQuizStore();

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <p className="text-muted text-lg">No questions available.</p>
      </div>
    );
  }

  const question = questions[currentIndex];
  const total = questions.length;

  return (
    <div className="animate-fade-in">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-navy">
            Question {currentIndex + 1} of {total}
          </span>
          <span className="text-xs text-muted">
            {Math.round(((currentIndex + 1) / total) * 100)}% complete
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <QuestionCard key={question.id} question={question} />
    </div>
  );
}
