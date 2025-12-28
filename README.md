# AI Powered PDF RAG Chat Application

An **AI-powered Retrieval-Augmented Generation (RAG) chat application** that enables users to have intelligent, contextual conversations with their PDF documents. The platform supports **text and voice-based interactions**, multi-session chat management, and secure, private document handling — all powered by state-of-the-art AI and real-time infrastructure.

---

## Overview

The **AI Powered PDF RAG Chat Application** allows users to upload PDF documents and ask questions in natural language. The system retrieves relevant document content using semantic search and generates accurate, contextual responses using advanced AI models.

Each user’s data is fully isolated, ensuring privacy and security. The application supports **multiple chat sessions**, **real-time messaging**, and **voice interactions**, making it ideal for research, learning, documentation review, and knowledge exploration.

---

## Key Features

### Authentication & User Privacy

* Secure authentication and user management powered by **Clerk**
* All PDFs, chat histories, and embeddings are **private and user-isolated**
* No cross-user data access

---

### PDF Upload & Document Chat

* Upload and chat with **multiple PDF documents**
* Ask questions directly related to document content
* Accurate answers generated using **RAG (Retrieval-Augmented Generation)**
* Download, view, and manage uploaded PDFs

---

### RAG & Semantic Search

* Full RAG pipeline powered by **LangChain**

  * PDF text extraction
  * Intelligent chunking & splitting
  * Embedding generation
* **Pinecone Vector Database** for scalable semantic search
* Fast and accurate retrieval of relevant document context

---

### Real-Time AI Chat

* Real-time chat experience powered by **Stream.io**
* Streaming AI responses for a smooth conversational flow
* Message-level actions:

  * Edit messages
  * Regenerate AI responses
  * Copy responses
  * Clear chat history

---

### Multi-Session Chat System

* Create and manage **multiple chat sessions** for different topics
* Each session maintains:

  * Its own chat history
  * Isolated document context
* Rename or delete chat sessions anytime

---

### Voice Mode (Hands-Free Interaction)

* Ask questions using **voice input**
* Hear AI responses via **text-to-speech**
* Ideal for accessibility and multitasking

**Voice Stack:**

* **Speech-to-Text (STT):** AssemblyAI (Realtime Transcription)
* **Text-to-Speech (TTS):** Google Gemini TTS API

---

### 📎 File & Message Management

* PDFs can be associated with chat sessions
* Download and manage uploaded documents easily
* Clean and intuitive UI for file handling

---

## Core Architecture & Tech Stack

| Category                   | Technology            |
| -------------------------- | --------------------- |
| **Frontend**               | Next.js               |
| **Authentication**         | Clerk                 |
| **Real-Time Chat & State** | Stream.io             |
| **AI / LLM**               | Google Gemini         |
| **Vector Database**        | Pinecone              |
| **RAG Orchestration**      | LangChain             |
| **Speech-to-Text**         | AssemblyAI            |
| **Text-to-Speech**         | Google Gemini TTS API |

---

## Data Security & Isolation

* User-based data isolation across:

  * PDFs
  * Chat sessions
  * Vector embeddings
* Secure authentication ensures only authorized access
* No document data is shared between users

---