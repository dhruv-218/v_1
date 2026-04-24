const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Upload a PDF and start processing.
 * @param {File} file
 * @returns {Promise<{session_id: string, status: string, pdf_name: string}>}
 */
export async function uploadPdf(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Poll processing status.
 * @param {string} sessionId
 * @returns {Promise<{stage: string, progress: number, message: string}>}
 */
export async function getStatus(sessionId) {
  const res = await fetch(`${API_BASE}/api/status/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

/**
 * Fetch the generated quiz.
 * @param {string} sessionId
 * @returns {Promise<{chapter: string, total_questions: number, questions: Array}>}
 */
export async function getQuiz(sessionId) {
  const res = await fetch(`${API_BASE}/api/quiz/${sessionId}`);
  if (!res.ok) throw new Error('Quiz not ready');
  return res.json();
}

/**
 * Submit an answer.
 * @param {string} sessionId
 * @param {number} questionId
 * @param {string} userAnswer
 * @returns {Promise<{is_correct: boolean, correct_answer: string, solution: string}>}
 */
export async function submitAnswer(sessionId, questionId, userAnswer) {
  const res = await fetch(`${API_BASE}/api/submit-answer/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id: questionId, user_answer: userAnswer }),
  });
  if (!res.ok) throw new Error('Failed to submit answer');
  return res.json();
}

/**
 * Stream chat response via SSE.
 * @param {string} sessionId
 * @param {number} questionId
 * @param {string} message
 * @param {Array} history
 * @param {function} onToken  - called with each token string
 * @param {function} onDone   - called when stream completes
 * @param {function} onError  - called on error
 */
export async function streamChat(sessionId, questionId, message, history, onToken, onDone, onError) {
  try {
    const res = await fetch(`${API_BASE}/api/chat/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, message, history }),
    });

    if (!res.ok) {
      onError?.(new Error('Chat request failed'));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);

        if (payload === '[DONE]') {
          onDone?.();
          return;
        }

        try {
          const data = JSON.parse(payload);
          if (data.token) {
            onToken(data.token);
          }
          if (data.error) {
            onError?.(new Error(data.error));
            return;
          }
        } catch {
          // ignore parse errors on partial data
        }
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(err);
  }
}

/**
 * Get video info for a question.
 */
export async function getVideo(sessionId, questionId) {
  const res = await fetch(`${API_BASE}/api/video/${sessionId}/${questionId}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Trigger video rendering.
 */
export async function renderVideo(sessionId, questionId) {
  const res = await fetch(`${API_BASE}/api/video/render/${sessionId}/${questionId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to start rendering');
  return res.json();
}

/**
 * Get the learning path Mermaid diagram.
 */
export async function getLearningPath(sessionId) {
  const res = await fetch(`${API_BASE}/api/learning-path/${sessionId}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Get all doubts.
 */
export async function getDoubts(sessionId) {
  const res = await fetch(`${API_BASE}/api/doubts/${sessionId}`);
  if (!res.ok) return { doubts: [] };
  return res.json();
}

/** Get the sessions base URL for static assets. */
export function getSessionsBaseUrl() {
  return `${API_BASE}/sessions`;
}
