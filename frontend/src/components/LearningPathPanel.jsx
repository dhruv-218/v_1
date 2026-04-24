import { useEffect, useState } from 'react';
import useQuizStore from '../store/useQuizStore';
import MermaidRenderer from './MermaidRenderer';
import { getLearningPath, getDoubts } from '../utils/api';

export default function LearningPathPanel() {
  const { sessionId, learningPathMermaid, setLearningPath, showHeatmap, toggleHeatmap } = useQuizStore();
  const [loading, setLoading] = useState(!learningPathMermaid);
  const [heatmapMermaid, setHeatmapMermaid] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!learningPathMermaid && sessionId) {
        try {
          const data = await getLearningPath(sessionId);
          if (data?.mermaid) {
            setLearningPath(data.mermaid);
          }
        } catch {
          // Learning path not available
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <svg className="w-8 h-8 animate-spin text-accent mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-muted">Loading learning path...</p>
      </div>
    );
  }

  if (!learningPathMermaid) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <p className="text-muted text-lg mb-4">Learning path not available yet.</p>
        <button
          onClick={() => useQuizStore.getState().setScreen('quiz')}
          className="btn-secondary"
        >
          ← Back to Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-navy">Learning Path</h2>
          <p className="text-muted text-sm mt-1">Topic dependency map for this chapter</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Heatmap toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-muted">Show weak topics</span>
            <button
              onClick={toggleHeatmap}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                showHeatmap ? 'bg-accent' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                showHeatmap ? 'translate-x-5' : ''
              }`} />
            </button>
          </label>

          <button
            onClick={() => useQuizStore.getState().setScreen('quiz')}
            className="btn-secondary text-sm"
          >
            ← Back to Quiz
          </button>
        </div>
      </div>

      {/* Color key */}
      <div className="flex items-center gap-4 mb-6 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" /> Easy
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-200 border border-amber-300" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-200 border border-red-300" /> Hard
        </span>
      </div>

      {/* Diagram */}
      <div className="card p-6 overflow-x-auto">
        <MermaidRenderer
          code={showHeatmap && heatmapMermaid ? heatmapMermaid : learningPathMermaid}
          id={showHeatmap ? 'heatmap-lp' : 'learning-path'}
        />
      </div>
    </div>
  );
}
