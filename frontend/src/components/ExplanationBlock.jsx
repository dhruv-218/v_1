import { useState } from 'react';
import useQuizStore from '../store/useQuizStore';

export default function ExplanationBlock({ solution, pageNumber, topic, renderLatex, questionId }) {
  const [expanded, setExpanded] = useState(true);
  const addChatMessage = useQuizStore((s) => s.addChatMessage);

  const handleSimpler = () => {
    // Pre-fill chat with a request for simpler explanation
    addChatMessage(questionId, {
      role: 'user',
      content: 'Can you explain this in simpler terms?',
    });
    // Scroll to chat section
    const chatEl = document.getElementById(`chat-${questionId}`);
    if (chatEl) chatEl.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span className="font-semibold text-navy text-sm">Explanation</span>
        </div>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 pb-5 animate-fade-in">
          {/* Source reference */}
          <div className="flex items-center gap-3 mb-4 text-xs text-muted">
            {pageNumber && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Page {pageNumber}
              </span>
            )}
            {topic && (
              <span className="flex items-center gap-1">
                📖 {topic}
              </span>
            )}
          </div>

          {/* Solution text */}
          <div
            className="prose prose-sm max-w-none font-serif text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderLatex(solution || 'No explanation available.') }}
          />

          {/* Simpler explanation button */}
          <button
            onClick={handleSimpler}
            className="btn-secondary mt-4 text-xs"
          >
            🔄 Ask for simpler explanation
          </button>
        </div>
      )}
    </div>
  );
}
