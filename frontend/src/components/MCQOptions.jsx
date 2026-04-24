export default function MCQOptions({ options, selected, onSelect, locked, correctAnswer, userAnswer }) {
  const getOptionLetter = (idx) => String.fromCharCode(65 + idx); // A, B, C, D

  const getState = (option, idx) => {
    if (!locked) {
      return selected === getOptionLetter(idx) ? 'selected' : 'default';
    }

    const letter = getOptionLetter(idx);
    const correctLetter = correctAnswer?.trim().toUpperCase();
    const userLetter = userAnswer?.trim().toUpperCase();

    if (letter === correctLetter) return 'correct';
    if (letter === userLetter && letter !== correctLetter) return 'incorrect';
    return 'locked';
  };

  return (
    <div className="space-y-3">
      {options.map((option, idx) => {
        const letter = getOptionLetter(idx);
        const state = getState(option, idx);

        return (
          <button
            key={idx}
            id={`option-${letter}`}
            onClick={() => !locked && onSelect(letter)}
            disabled={locked}
            className={`
              option-card w-full text-left
              ${state === 'selected' ? 'selected' : ''}
              ${state === 'correct' ? 'correct' : ''}
              ${state === 'incorrect' ? 'incorrect' : ''}
              ${state === 'locked' ? 'locked' : ''}
            `}
          >
            {/* Letter circle */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              text-sm font-semibold transition-colors
              ${state === 'selected' ? 'bg-accent text-white' :
                state === 'correct' ? 'bg-success text-white' :
                state === 'incorrect' ? 'bg-error text-white' :
                'bg-gray-100 text-gray-500'}
            `}>
              {state === 'correct' ? '✓' : state === 'incorrect' ? '✗' : letter}
            </div>

            {/* Option text */}
            <span className={`text-sm leading-relaxed ${
              state === 'correct' ? 'text-emerald-800 font-medium' :
              state === 'incorrect' ? 'text-red-800' :
              'text-gray-700'
            }`}>
              {option.replace(/^[A-D]\.\s*/, '')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
