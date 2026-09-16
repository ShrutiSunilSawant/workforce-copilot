"""
WorkforceIQ - RAG Pipeline
Document → Embedding → ChromaDB → Retrieval → LLM Answer
Uses: sentence-transformers/all-MiniLM-L6-v2 + ChromaDB
"""

import os
import uuid
from pathlib import Path
from typing import Optional
from loguru import logger
from functools import lru_cache


VECTOR_DB_PATH = "vector_db/chroma"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 512
CHUNK_OVERLAP = 64
TOP_K = 4


class RAGPipeline:
    """
    Full RAG pipeline for HR document Q&A.
    
    Flow:
    1. Upload document (PDF/TXT/DOCX)
    2. Chunk text into segments
    3. Embed with sentence-transformers
    4. Store in ChromaDB
    5. On query: embed question → find similar chunks → LLM answer
    """

    def __init__(self):
        self._collection = None
        self._embedder = None
        self._loaded = False

    def _load(self):
        if self._loaded:
            return
        try:
            import chromadb
            from sentence_transformers import SentenceTransformer
            
            Path(VECTOR_DB_PATH).mkdir(parents=True, exist_ok=True)
            
            client = chromadb.PersistentClient(path=VECTOR_DB_PATH)
            self._collection = client.get_or_create_collection(
                name="hr_documents",
                metadata={"hnsw:space": "cosine"},
            )
            
            logger.info(f"🧠 Loading embedding model: {EMBEDDING_MODEL}")
            self._embedder = SentenceTransformer(EMBEDDING_MODEL)
            self._loaded = True
            logger.info(f"✅ RAG pipeline ready. Documents in DB: {self._collection.count()}")
        except Exception as e:
            logger.warning(f"⚠️  RAG setup failed: {e}. Using fallback mode.")
            self._loaded = True

    def _embed(self, texts: list[str]) -> list[list[float]]:
        """Embed texts using sentence-transformers"""
        if self._embedder:
            return self._embedder.encode(texts, convert_to_numpy=True).tolist()
        # Fallback: random embeddings (for demo without models)
        import numpy as np
        return [np.random.rand(384).tolist() for _ in texts]

    def _chunk_text(self, text: str) -> list[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []
        step = CHUNK_SIZE - CHUNK_OVERLAP
        
        for i in range(0, len(words), step):
            chunk = " ".join(words[i:i + CHUNK_SIZE])
            if chunk.strip():
                chunks.append(chunk)
        
        return chunks

    def _extract_text(self, file_path: str, content_type: str) -> str:
        """Extract text from uploaded document"""
        try:
            if content_type == "application/pdf" or file_path.endswith(".pdf"):
                from pypdf import PdfReader
                reader = PdfReader(file_path)
                return "\n".join(page.extract_text() or "" for page in reader.pages)
            
            elif content_type in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",) or file_path.endswith(".docx"):
                from docx import Document
                doc = Document(file_path)
                return "\n".join(para.text for para in doc.paragraphs)
            
            else:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return ""

    def add_document(
        self,
        file_path: str,
        content_type: str = "text/plain",
        document_name: str = "",
        metadata: Optional[dict] = None,
    ) -> dict:
        """
        Add a document to the RAG knowledge base.
        
        Returns:
            {chunks_added, document_id, status}
        """
        self._load()
        
        if not self._collection:
            return {"status": "error", "message": "Vector store not available"}
        
        document_id = str(uuid.uuid4())
        text = self._extract_text(file_path, content_type)
        
        if not text.strip():
            return {"status": "error", "message": "Could not extract text from document"}
        
        chunks = self._chunk_text(text)
        if not chunks:
            return {"status": "error", "message": "Document is empty after chunking"}
        
        # Embed all chunks
        embeddings = self._embed(chunks)
        
        # Build metadata for each chunk
        chunk_ids = [f"{document_id}_{i}" for i in range(len(chunks))]
        chunk_metadata = [
            {
                "document_id": document_id,
                "document_name": document_name or Path(file_path).name,
                "chunk_index": i,
                **(metadata or {}),
            }
            for i in range(len(chunks))
        ]
        
        # Store in ChromaDB
        self._collection.add(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=chunk_metadata,
        )
        
        logger.info(f"📚 Added document '{document_name}' — {len(chunks)} chunks")
        
        return {
            "status": "success",
            "document_id": document_id,
            "chunks_added": len(chunks),
            "document_name": document_name,
        }

    def add_text_directly(self, text: str, name: str, metadata: Optional[dict] = None) -> dict:
        """Add raw text content to knowledge base (for built-in HR policies)"""
        self._load()
        
        document_id = str(uuid.uuid4())
        chunks = self._chunk_text(text)
        embeddings = self._embed(chunks)
        chunk_ids = [f"{document_id}_{i}" for i in range(len(chunks))]
        chunk_metadata = [
            {"document_id": document_id, "document_name": name, "chunk_index": i, **(metadata or {})}
            for i in range(len(chunks))
        ]
        
        self._collection.add(
            ids=chunk_ids, embeddings=embeddings,
            documents=chunks, metadatas=chunk_metadata,
        )
        return {"status": "success", "document_id": document_id, "chunks_added": len(chunks)}

    def query(self, question: str, top_k: int = TOP_K, filter_metadata: Optional[dict] = None) -> dict:
        """
        Query the RAG knowledge base.
        
        Returns:
            {answer, sources, context_used}
        """
        self._load()
        
        if not self._collection:
            return {
                "answer": self._fallback_answer(question),
                "sources": [],
                "context_used": False,
            }

        # Make the assistant useful out of the box while still allowing
        # uploaded documents to become its primary source of truth.
        if self._collection.count() == 0:
            self.add_text_directly(DEFAULT_HR_KNOWLEDGE, "WorkforceIQ Default HR Policies")
        
        # Embed the question
        question_embedding = self._embed([question])[0]
        
        # Retrieve similar chunks
        results = self._collection.query(
            query_embeddings=[question_embedding],
            n_results=min(top_k, self._collection.count()),
            where=filter_metadata,
        )
        
        if not results["documents"] or not results["documents"][0]:
            return {
                "answer": self._fallback_answer(question),
                "sources": [],
                "context_used": False,
            }
        
        # Build context from retrieved chunks
        retrieved_chunks = results["documents"][0]
        retrieved_metadata = results["metadatas"][0]
        distances = results["distances"][0] if "distances" in results else []
        
        context = "\n\n".join([
            f"[Source: {meta.get('document_name', 'Unknown')}]\n{chunk}"
            for chunk, meta in zip(retrieved_chunks, retrieved_metadata)
        ])
        
        # Generate answer using LLM
        answer = self._generate_answer(question, context)
        
        # Build source citations
        sources = []
        seen = set()
        for meta, dist in zip(retrieved_metadata, distances):
            doc_name = meta.get("document_name", "Unknown")
            if doc_name not in seen:
                sources.append({
                    "document": doc_name,
                    "relevance": round(1 - float(dist), 3) if dist else 0.9,
                    "chunk_index": meta.get("chunk_index", 0),
                })
                seen.add(doc_name)
        
        return {
            "answer": answer,
            "sources": sources,
            "context_used": True,
            "chunks_retrieved": len(retrieved_chunks),
        }

    def _generate_answer(self, question: str, context: str) -> str:
        """Generate LLM answer from retrieved context"""
        try:
            from utils.llm import get_llm
            llm = get_llm()
            llm._load()

            # The local model is optional. When it cannot be loaded, use the
            # retrieved policy text rather than the generic LLM template.
            if llm.pipeline is None:
                return self._extract_answer_from_context(question, context)
            
            prompt = f"""You are an HR policy assistant. Answer the question using ONLY the provided context.
If the answer is not in the context, say "I couldn't find this information in the uploaded documents."

Context:
{context[:2000]}

Question: {question}

Answer:"""
            
            return llm.generate(prompt, max_tokens=400)
        except Exception as e:
            logger.error(f"LLM answer generation failed: {e}")
            return self._extract_answer_from_context(question, context)

    def _extract_answer_from_context(self, question: str, context: str) -> str:
        """Simple extractive fallback — returns most relevant context paragraph"""
        paragraphs = context.split("\n\n")
        q_words = set(question.lower().split())
        
        best_para = max(
            paragraphs,
            key=lambda p: sum(1 for w in q_words if w in p.lower()),
            default=paragraphs[0] if paragraphs else "",
        )
        
        return f"Based on the HR documents: {best_para[:500]}..."

    def _fallback_answer(self, question: str) -> str:
        """Answer when no documents are in the knowledge base"""
        return (
            "No HR documents have been uploaded yet. Please upload your HR policy documents, "
            "employee handbooks, or compliance guides using the document upload feature. "
            "Once uploaded, I can answer questions about leave policies, promotion criteria, "
            "benefits, compliance requirements, and more."
        )

    def list_documents(self) -> list[dict]:
        """List all documents in the knowledge base"""
        self._load()
        if not self._collection:
            return []
        
        results = self._collection.get()
        if not results["metadatas"]:
            return []
        
        # Deduplicate by document_id
        seen = {}
        for meta in results["metadatas"]:
            doc_id = meta.get("document_id", "unknown")
            if doc_id not in seen:
                seen[doc_id] = {
                    "document_id": doc_id,
                    "document_name": meta.get("document_name", "Unknown"),
                    "chunk_count": 0,
                }
            seen[doc_id]["chunk_count"] += 1
        
        return list(seen.values())

    def delete_document(self, document_id: str) -> dict:
        """Remove a document from the knowledge base"""
        self._load()
        if not self._collection:
            return {"status": "error"}
        
        results = self._collection.get(where={"document_id": document_id})
        if results["ids"]:
            self._collection.delete(ids=results["ids"])
            return {"status": "success", "deleted_chunks": len(results["ids"])}
        return {"status": "not_found"}


@lru_cache(maxsize=1)
def get_rag_pipeline() -> RAGPipeline:
    return RAGPipeline()


# Seed with built-in HR knowledge on startup
DEFAULT_HR_KNOWLEDGE = """
WORKFORCEIQ DEFAULT HR KNOWLEDGE BASE

Annual Leave Policy:
Employees are entitled to 20 days of paid annual leave per year. Leave requests must be submitted at least 2 weeks in advance. Unused leave can be carried over up to 5 days into the next year. Additional leave can be requested for exceptional circumstances with manager approval.

Remote Work Policy:
Employees may work remotely up to 3 days per week with manager approval. Core hours of 10am-3pm must be maintained in the team's primary timezone. Remote work equipment is provided by the company. Employees must maintain a professional workspace.

Performance Review Process:
Performance reviews are conducted twice annually, in June and December. Reviews include self-assessment, manager feedback, and peer feedback. Compensation adjustments are tied to performance ratings. Promotion eligibility is reviewed during annual reviews.

Promotion Policy:
Employees are eligible for promotion after a minimum of 18 months in their current role. Promotions require a consistent performance rating of "Meets Expectations" or higher. The promotion process includes a panel review by senior leadership. Salary increases of 15-25% accompany promotions.

Employee Wellness Program:
The company provides mental health support including 8 free therapy sessions per year. Employee Assistance Program (EAP) is available 24/7. Gym membership reimbursement up to $50/month. Wellness days (2 additional PTO days) for mental health breaks.

Code of Conduct:
All employees must maintain professional behavior in the workplace. Harassment, discrimination, and bullying are strictly prohibited. Violations should be reported to HR immediately. Retaliation against reporters is a terminable offense.

Compensation & Benefits:
Health insurance (medical, dental, vision) fully covered for employees. 401(k) with 4% company match. Stock options for all full-time employees. Annual bonus based on company and individual performance (10-20% of salary).
"""


def seed_default_knowledge():
    """Add default HR knowledge to RAG pipeline on startup"""
    pipeline = get_rag_pipeline()
    if pipeline._collection and pipeline._collection.count() == 0:
        logger.info("📚 Seeding default HR knowledge base...")
        pipeline.add_text_directly(DEFAULT_HR_KNOWLEDGE, "WorkforceIQ Default HR Policies")
