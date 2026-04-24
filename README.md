# AI Tutor - Personalized Learning Companion 🎓

An interactive, AI-powered tutoring application that transforms static PDF textbooks and documents into personalized, dynamic learning experiences. 

By simply uploading a PDF, the AI Tutor extracts the content, builds a local knowledge base, and generates quizzes, visual learning paths, and educational animations to help you master the material.

## ✨ Features

- **Automated Knowledge Extraction**: Automatically extracts text from uploaded PDFs and builds a local Retrieval-Augmented Generation (RAG) knowledge base.
- **Dynamic Quiz Generation**: Creates MCQs, short-answer, and true/false questions based on the uploaded document to test your knowledge.
- **Adaptive Learning Paths & Doubt Tracking**: Tracks your incorrect answers to map out your "doubts" and generates remedial learning paths visualized with Mermaid diagrams.
- **Interactive AI Chat**: Ask context-aware questions and chat directly with the AI about specific concepts from the document.
- **Educational Visuals & Animations**: Automatically generates Python scripts for Manim educational animations and renders complex math equations using KaTeX.
- **Local & Private**: Powered by local LLM inference via Ollama and local vector storage via ChromaDB, ensuring your data never leaves your machine.

---

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI
- **LLM Engine**: Ollama (Local inference and embeddings)
- **Vector Database**: ChromaDB (Semantic search / RAG)
- **Document Processing**: PyMuPDF (`fitz`), LangChain (Text Splitters)

### Frontend
- **Framework**: React 19 (built with Vite)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Visualization**: Mermaid.js (Learning paths) & KaTeX (Math rendering)
- **File Uploads**: React Dropzone

---

## 📂 Project Structure

```text
.
├── backend/                  # FastAPI backend server
│   ├── main.py               # API routes (upload, status, quiz, chat)
│   ├── pipeline.py           # Core LLM prompting templates and generation logic
│   ├── config.py             # Environment and application configuration
│   ├── session_manager.py    # Manages user sessions and doubt tracking
│   ├── manim_validator.py    # Validates and executes Manim animation scripts
│   ├── requirements.txt      # Python dependencies
│   └── sessions/             # Local storage for user generated content (quizzes, learning paths, etc.)
│
└── frontend/                 # React frontend application
    ├── src/
    │   ├── App.jsx           # Main application shell
    │   ├── components/       # Reusable UI components (ChatBox, QuizScreen, MermaidRenderer, etc.)
    │   ├── store/            # Zustand state management
    │   └── utils/            # Helper functions
    ├── package.json          # Node dependencies
    ├── tailwind.config.js    # Tailwind configuration
    └── vite.config.js        # Vite configuration
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- [Ollama](https://ollama.com/) installed and running locally.
- *Ensure you have pulled the required Ollama models (e.g., `llama3` or `llama3.1`).*

### 1. Backend Setup

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI development server
uvicorn main:app --reload
```
The FastAPI backend will typically run on `http://localhost:8000`.

### 2. Frontend Setup

Open a new terminal window and navigate to the `frontend/` directory:

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The React frontend will typically run on `http://localhost:5173`.

---

## 🎮 Usage

1. **Upload a Document**: Open the frontend in your browser and upload any educational PDF.
2. **Wait for Processing**: The backend will extract the text, create chunks, embed them into ChromaDB, and generate an initial quiz.
3. **Take the Quiz**: Answer the generated questions. Incorrect answers are automatically logged in the Doubt Tracker.
4. **Follow the Learning Path**: Based on your doubts, a customized Mermaid flowchart/learning path is generated to guide your revision.
5. **Chat with the AI**: If you get stuck, use the chat box to ask questions specific to the uploaded material.

---

## 📝 License
This project is open-source and available under the MIT License.
