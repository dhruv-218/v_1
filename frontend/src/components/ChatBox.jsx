import { useState, useRef, useEffect } from 'react';
import useQuizStore from '../store/useQuizStore';
import { streamChat } from '../utils/api';

export default function ChatBox({ question, answer }) {
  const sessionId = useQuizStore((s) => s.sessionId);
  const chatHistories = useQuizStore((s) => s.chatHistories);
  const addChatMessage = useQuizStore((s) => s.addChatMessage);
  const updateLastChatMessage = useQuizStore((s) => s.updateLastChatMessage);

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const messages = chatHistories[question.id] || [];

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-trigger chat if there's a pre-filled message (from "ask for simpler explanation")
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'user' && !isStreaming) {
      sendMessage(messages[0].content, true);
    }
  }, [messages.length]);

  const sendMessage = async (text, skipAdd = false) => {
    if (!text.trim() || isStreaming) return;

    const userMsg = text.trim();
    if (!skipAdd) {
      addChatMessage(question.id, { role: 'user', content: userMsg });
    }
    setInput('');
    setIsStreaming(true);

    // Add empty AI message placeholder
    addChatMessage(question.id, { role: 'assistant', content: '' });

    // Build history for API (exclude the empty placeholder)
    const currentHistory = useQuizStore.getState().chatHistories[question.id] || [];
    const historyForApi = currentHistory.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await streamChat(
      sessionId,
      question.id,
      userMsg,
      historyForApi,
      (token) => {
        updateLastChatMessage(question.id, token);
      },
      () => {
        setIsStreaming(false);
      },
      () => {
        setIsStreaming(false);
        updateLastChatMessage(question.id, '\n\n_Error: Failed to get response._');
      },
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div id={`chat-${question.id}`} className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="font-semibold text-navy text-sm">Ask about this question</span>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 max-h-80 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted text-sm py-6">
            Ask any question about this concept...
          </p>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {isStreaming && idx === messages.length - 1 && msg.role === 'assistant' && (
                <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-gray-50/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this question or concept..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface
                       text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg bg-navy text-white disabled:opacity-40
                       hover:bg-navy-light transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
