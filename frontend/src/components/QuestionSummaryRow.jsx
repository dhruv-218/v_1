import { useState } from 'react';

export default function QuestionSummaryRow({ question, answer }) {
  const [expanded, setExpanded] = useState(false);

  const isCorrect = answer?.isCorrect;
  const wasAnswered = !!answer;

  const typeLabel = {
    mcq: 'MCQ',
    short_answer: 'Short Answer',
    true_false: 'True/False',
  }[question.type] || question.type;

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors text-left"
      >
        {/* Status icon */}
        <span className="text-lg flex-shrink-0">
          {!wasAnswered ? '⬜' : isCorrect ? '✅' : '❌'}
        </span>

        {/* Question info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-navy text-sm">Q{question.id}</span>
            <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded">
              {typeLabel}
            </span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted">{question.topic || 'General'}</span>
            {question.page_number && (
              <>
                <span className="text-xs text-muted">·</span>
                <span className="text-xs text-muted">Page {question.page_number}</span>
              </>
            )}
          </div>
          {wasAnswered && (
            <p className="text-xs text-muted mt-1">
              Your answer: <span className="font-medium">{answer.userAnswer}</span>
              {!isCorrect && (
                <> · Correct: <span className="font-medium text-success">{answer.correctAnswer}</span></>
              )}
            </p>
          )}
        </div>

        {/* Expand icon */}
        <svg
          className={`w-4 h-4 text-muted transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border animate-fade-in">
          {/* Question text */}
          <div className="mt-3 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Question</p>
            <p className="text-sm font-serif text-gray-700">{question.question}</p>
          </div>

          {/* Options for MCQ */}
          {question.type === 'mcq' && question.options && (
            <div className="mb-3 space-y-1">
              {question.options.map((opt, idx) => (
                <p key={idx} className="text-xs text-gray-600 pl-4">{opt}</p>
              ))}
            </div>
          )}

          {/* Solution */}
          {(answer?.solution || question.solution) && (
            <div className="mt-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Explanation</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {answer?.solution || question.solution}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
