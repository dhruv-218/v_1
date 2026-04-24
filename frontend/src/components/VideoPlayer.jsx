import { useState, useEffect } from 'react';
import useQuizStore from '../store/useQuizStore';
import { getVideo, renderVideo } from '../utils/api';

export default function VideoPlayer({ questionId }) {
  const sessionId = useQuizStore((s) => s.sessionId);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let pollInterval = null;

    const fetchVideo = async () => {
      try {
        const info = await getVideo(sessionId, questionId);
        if (!cancelled) {
          setVideoInfo(info);
          setLoading(false);

          // If rendering, poll for completion
          if (info?.status === 'rendering') {
            setIsRendering(true);
            pollInterval = setInterval(async () => {
              const updated = await getVideo(sessionId, questionId);
              if (!cancelled) {
                setVideoInfo(updated);
                if (updated?.status !== 'rendering') {
                  setIsRendering(false);
                  clearInterval(pollInterval);
                }
              }
            }, 3000);
          }
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVideo();
    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, questionId]);

  const handleRender = async () => {
    setIsRendering(true);
    try {
      await renderVideo(sessionId, questionId);
      // Start polling
      const poll = setInterval(async () => {
        const info = await getVideo(sessionId, questionId);
        setVideoInfo(info);
        if (info?.status !== 'rendering') {
          setIsRendering(false);
          clearInterval(poll);
        }
      }, 3000);
    } catch {
      setIsRendering(false);
    }
  };

  if (loading) return null;

  // No video script exists yet
  if (!videoInfo || videoInfo.status === 'not_generated') {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎬</span>
            <span className="font-semibold text-navy text-sm">Visual Explanation</span>
          </div>
          <button
            onClick={handleRender}
            disabled={isRendering}
            className="btn-secondary text-xs"
          >
            {isRendering ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              '✨ Generate Visual Explanation'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Rendering in progress
  if (videoInfo.status === 'rendering' || isRendering) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="font-semibold text-navy text-sm">Rendering animation...</p>
            <p className="text-xs text-muted">This may take a minute</p>
          </div>
        </div>
      </div>
    );
  }

  // Rendering failed
  if (videoInfo.status === 'failed') {
    return (
      <div className="card p-5 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg text-red-500">⚠️</span>
            <span className="font-semibold text-navy text-sm">Rendering Failed</span>
          </div>
          <button
            onClick={handleRender}
            className="btn-secondary text-xs"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // Video rendered
  if (videoInfo.status === 'rendered' && videoInfo.video_path) {
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎬</span>
            <span className="font-semibold text-navy text-sm">Visual Explanation</span>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1">
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  setPlaybackRate(rate);
                  const video = document.getElementById(`video-${questionId}`);
                  if (video) video.playbackRate = rate;
                }}
                className={`px-2 py-0.5 text-xs rounded font-mono transition-colors ${
                  playbackRate === rate
                    ? 'bg-navy text-white'
                    : 'text-muted hover:bg-gray-100'
                }`}
              >
                {rate}×
              </button>
            ))}
          </div>
        </div>

        <video
          id={`video-${questionId}`}
          controls
          className="w-full"
          src={videoInfo.video_path}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // Script exists but not rendered
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <span className="font-semibold text-navy text-sm">Visual Explanation</span>
        </div>
        <button
          onClick={handleRender}
          disabled={isRendering}
          className="btn-secondary text-xs"
        >
          ▶️ Render Animation
        </button>
      </div>
    </div>
  );
}
