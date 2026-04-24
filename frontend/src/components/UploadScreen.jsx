import { useState, useRef, useEffect } from 'react';
import useQuizStore from '../store/useQuizStore';
import PDFUpload from './PDFUpload';
import ProgressStages from './ProgressStages';
import { uploadPdf, getStatus, getQuiz } from '../utils/api';

export default function UploadScreen() {
  const { sessionId, setSession, setStatus, setQuestions, setScreen, stage, progress, statusMessage } = useQuizStore();
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const pollRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleUpload = async (file) => {
    setError(null);

    // Client-side validations
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File exceeds 50 MB limit. Please use a smaller PDF.');
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadPdf(file);
      setSession(result.session_id, result.pdf_name);
      setStatus('extracting', 0, 'Starting pipeline...');

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const status = await getStatus(result.session_id);
          setStatus(status.stage, status.progress, status.message);

          if (status.stage === 'ready') {
            clearInterval(pollRef.current);
            pollRef.current = null;

            // Fetch quiz
            const quiz = await getQuiz(result.session_id);
            setQuestions(quiz.questions || []);
            setScreen('quiz');
          }

          if (status.stage === 'error') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setError(status.message);
            setIsUploading(false);
          }
        } catch {
          // Poll error — continue trying
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Upload failed. Is the server running?');
      setIsUploading(false);
    }
  };

  const isProcessing = sessionId && stage && stage !== 'ready' && stage !== 'error';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in">
      {/* Hero text */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-4 text-balance">
          Learn any chapter,
          <br />
          <span className="text-accent">intelligently.</span>
        </h1>
        <p className="text-muted text-lg max-w-md mx-auto leading-relaxed">
          Upload a PDF chapter and get AI-generated quizzes, visual explanations, and a personalized learning path.
        </p>
      </div>

      {/* Upload / Progress area */}
      <div className="w-full max-w-lg">
        {!isProcessing ? (
          <PDFUpload onUpload={handleUpload} isUploading={isUploading} />
        ) : (
          <ProgressStages
            stage={stage}
            progress={progress}
            message={statusMessage}
          />
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-card text-error text-sm animate-fade-in">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p>{error}</p>
                <button
                  onClick={() => { setError(null); setIsUploading(false); }}
                  className="mt-2 text-error underline hover:no-underline text-xs font-medium"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
        {[
          { icon: '📝', title: 'Smart Quizzes', desc: 'MCQ, short answer, and true/false questions grounded in your content.' },
          { icon: '🎬', title: 'Visual Explanations', desc: 'AI-generated Manim animations for complex concepts.' },
          { icon: '🗺️', title: 'Learning Path', desc: 'Interactive topic map highlighting your weak areas.' },
        ].map((f) => (
          <div key={f.title} className="text-center p-5">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-navy text-sm mb-1">{f.title}</h3>
            <p className="text-muted text-xs leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
