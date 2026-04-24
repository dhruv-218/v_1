const STAGE_LABELS = {
  extracting:           'Extracting content...',
  embedding:            'Building knowledge base...',
  generating_questions: 'Generating questions...',
  ready:                'Almost ready...',
};

const STAGE_ORDER = ['extracting', 'embedding', 'generating_questions', 'ready'];

export default function ProgressStages({ stage, progress, message }) {
  const currentIdx = STAGE_ORDER.indexOf(stage);

  return (
    <div className="card p-8 animate-fade-in">
      {/* Progress bar */}
      <div className="progress-bar mb-6">
        <div
          className="progress-fill"
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>

      {/* Stage indicators */}
      <div className="space-y-3 mb-6">
        {STAGE_ORDER.map((s, idx) => {
          const isActive = idx === currentIdx;
          const isDone = idx < currentIdx;

          return (
            <div
              key={s}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isActive ? 'opacity-100' : isDone ? 'opacity-60' : 'opacity-30'
              }`}
            >
              {/* Status icon */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDone
                  ? 'bg-success text-white'
                  : isActive
                    ? 'bg-accent text-white animate-pulse-soft'
                    : 'bg-gray-200 text-gray-400'
              }`}>
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isActive ? (
                  <div className="w-2 h-2 bg-white rounded-full" />
                ) : (
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                )}
              </div>

              <span className={`text-sm ${isActive ? 'font-medium text-navy' : 'text-muted'}`}>
                {STAGE_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current message */}
      <div className="text-center">
        <p className="text-muted text-sm">{message}</p>
        <p className="text-navy font-semibold text-lg mt-1">{progress}%</p>
      </div>
    </div>
  );
}
