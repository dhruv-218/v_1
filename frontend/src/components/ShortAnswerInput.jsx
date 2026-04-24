export default function ShortAnswerInput({ value, onChange, locked, correctAnswer, isCorrect }) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          id="short-answer-input"
          value={value}
          onChange={(e) => !locked && onChange(e.target.value)}
          disabled={locked}
          placeholder="Type your answer here..."
          rows={4}
          maxLength={1000}
          className={`
            w-full px-4 py-3 rounded-card border bg-surface
            font-serif text-base leading-relaxed
            resize-none transition-colors
            focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
            disabled:bg-gray-50
            ${locked
              ? isCorrect
                ? 'border-success bg-emerald-50/30'
                : 'border-error bg-red-50/30'
              : 'border-border'
            }
          `}
        />
        <span className="absolute bottom-2 right-3 text-xs text-muted">
          {value.length}/1000
        </span>
      </div>

      {/* Show correct answer after submission */}
      {locked && correctAnswer && (
        <div className={`p-4 rounded-card border animate-fade-in ${
          isCorrect
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-muted">
            {isCorrect ? '✓ Correct answer' : 'Expected answer'}
          </p>
          <p className="text-sm font-serif text-gray-800">{correctAnswer}</p>
        </div>
      )}
    </div>
  );
}
