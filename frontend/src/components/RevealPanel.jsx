import ExplanationBlock from './ExplanationBlock';
import VideoPlayer from './VideoPlayer';
import ChatBox from './ChatBox';

export default function RevealPanel({ question, answer, renderLatex }) {
  return (
    <div className="space-y-6 mt-6 animate-fade-in">
      {/* Result banner */}
      <div className={`p-4 rounded-card border ${
        answer.isCorrect
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{answer.isCorrect ? '✅' : '❌'}</span>
          <span className={`font-semibold ${
            answer.isCorrect ? 'text-emerald-800' : 'text-red-800'
          }`}>
            {answer.isCorrect ? 'Correct!' : `Incorrect — the answer is ${answer.correctAnswer}`}
          </span>
        </div>
      </div>

      {/* Explanation */}
      <ExplanationBlock
        solution={question.solution}
        pageNumber={question.page_number}
        topic={question.topic}
        renderLatex={renderLatex}
        questionId={question.id}
      />

      {/* Video */}
      <VideoPlayer questionId={question.id} />

      {/* Chat */}
      <ChatBox question={question} answer={answer} />
    </div>
  );
}
