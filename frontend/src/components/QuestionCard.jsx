import { useState, useEffect } from 'react';
import useQuizStore from '../store/useQuizStore';
import { submitAnswer } from '../utils/api';
import MCQOptions from './MCQOptions';
import TrueFalseToggle from './TrueFalseToggle';
import ShortAnswerInput from './ShortAnswerInput';
import RevealPanel from './RevealPanel';
import katex from 'katex';

/** Render LaTeX in text: replaces $...$ and $$...$$ with KaTeX HTML */
function renderLatex(text) {
  if (!text) return '';
  // Replace display math $$...$$
  let html = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }); }
    catch { return tex; }
  });
  // Replace inline math $...$
  html = html.replace(/\$([^\$]+?)\$/g, (_, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }); }
    catch { return tex; }
  });
  return html;
}

export default function QuestionCard({ question }) {
  const { sessionId, answers, submitAnswer: storeSubmit, nextQuestion } = useQuizStore();
  const [selected, setSelected] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const existingAnswer = answers[question.id];
  const isRevealed = !!existingAnswer;

  // Reset selection when question changes
  useEffect(() => {
    if (existingAnswer) {
      setSelected(existingAnswer.userAnswer);
    } else {
      setSelected('');
    }
  }, [question.id, existingAnswer]);

  const handleSubmit = async () => {
    if (!selected.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await submitAnswer(sessionId, question.id, selected);
      storeSubmit(
        question.id,
        selected,
        result.is_correct,
        result.correct_answer,
        result.solution,
      );
    } catch (err) {
      // Fallback: do client-side check
      const correct = String(question.answer || '').trim().toUpperCase();
      const given = selected.trim().toUpperCase();
      const isCorrect = correct.includes(given) || given.includes(correct);
      storeSubmit(question.id, selected, isCorrect, question.answer, question.solution);
    } finally {
      setIsSubmitting(false);
    }
  };

  const difficultyClass = {
    easy: 'badge-easy',
    medium: 'badge-medium',
    hard: 'badge-hard',
  }[question.difficulty] || 'badge-medium';

  return (
    <div className="animate-slide-in">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={difficultyClass}>
          {question.difficulty || 'medium'}
        </span>
        <span className="badge bg-navy-50 text-navy border border-navy-100">
          {question.topic || 'General'}
        </span>
        {question.page_number && (
          <span className="text-xs text-muted ml-auto">
            📄 Page {question.page_number}
          </span>
        )}
      </div>

      {/* Question text */}
      <div className="card p-6 mb-6">
        <h2
          className="text-xl font-serif text-navy leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderLatex(question.question) }}
        />
      </div>

      {/* Answer input */}
      <div className="mb-6">
        {question.type === 'mcq' && (
          <MCQOptions
            options={question.options || []}
            selected={selected}
            onSelect={setSelected}
            locked={isRevealed}
            correctAnswer={existingAnswer?.correctAnswer}
            userAnswer={existingAnswer?.userAnswer}
          />
        )}
        {question.type === 'true_false' && (
          <TrueFalseToggle
            selected={selected}
            onSelect={setSelected}
            locked={isRevealed}
            correctAnswer={existingAnswer?.correctAnswer}
            userAnswer={existingAnswer?.userAnswer}
          />
        )}
        {question.type === 'short_answer' && (
          <ShortAnswerInput
            value={selected}
            onChange={setSelected}
            locked={isRevealed}
            correctAnswer={existingAnswer?.correctAnswer}
            isCorrect={existingAnswer?.isCorrect}
          />
        )}
      </div>

      {/* Submit button */}
      {!isRevealed && (
        <button
          id={`submit-q${question.id}`}
          onClick={handleSubmit}
          disabled={!selected.trim() || isSubmitting}
          className="btn-primary w-full"
        >
          {isSubmitting ? 'Checking...' : 'Submit Answer'}
        </button>
      )}

      {/* Reveal panel */}
      {isRevealed && (
        <RevealPanel
          question={question}
          answer={existingAnswer}
          renderLatex={renderLatex}
        />
      )}

      {/* Next button */}
      {isRevealed && (
        <button
          id={`next-q${question.id}`}
          onClick={nextQuestion}
          className="btn-primary w-full mt-6"
        >
          {useQuizStore.getState().currentIndex < useQuizStore.getState().questions.length - 1
            ? 'Next Question →'
            : 'View Summary'}
        </button>
      )}
    </div>
  );
}
