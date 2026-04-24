export default function TrueFalseToggle({ selected, onSelect, locked, correctAnswer, userAnswer }) {
  const getState = (value) => {
    if (!locked) {
      return selected === value ? 'selected' : 'default';
    }

    const correct = correctAnswer?.trim();
    const user = userAnswer?.trim();

    // Normalize: the correct answer might be "True" or "False"
    const isCorrectValue = correct?.toLowerCase().startsWith(value.toLowerCase());
    const isUserValue = user?.toLowerCase().startsWith(value.toLowerCase());

    if (isCorrectValue) return 'correct';
    if (isUserValue && !isCorrectValue) return 'incorrect';
    return 'locked';
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {['True', 'False'].map((value) => {
        const state = getState(value);

        return (
          <button
            key={value}
            id={`tf-${value.toLowerCase()}`}
            onClick={() => !locked && onSelect(value)}
            disabled={locked}
            className={`
              card p-6 text-center text-lg font-semibold transition-all duration-200
              ${state === 'selected'
                ? 'border-accent bg-navy-50 text-navy shadow-glow'
                : state === 'correct'
                  ? 'border-success bg-emerald-50 text-emerald-800'
                  : state === 'incorrect'
                    ? 'border-error bg-red-50 text-red-800'
                    : state === 'locked'
                      ? 'opacity-60'
                      : 'hover:border-accent/40 hover:bg-navy-50/30 cursor-pointer text-gray-600'
              }
              ${locked ? 'cursor-default' : 'cursor-pointer'}
            `}
          >
            <div className="mb-2 text-2xl">
              {state === 'correct' ? '✓' : state === 'incorrect' ? '✗' : value === 'True' ? '👍' : '👎'}
            </div>
            {value}
          </button>
        );
      })}
    </div>
  );
}
