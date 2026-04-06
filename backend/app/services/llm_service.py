from typing import Optional
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.services.rag_service import get_relevant_chunks, build_rag_context, format_sources

settings = get_settings()

_client: Optional[AsyncOpenAI] = None

def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


# Instructions to the model: keep chat history and knowledge base as separate contexts.
# Instructions to the model: English meta-language for reliability; user-facing answers follow user language.

SYSTEM_IDENTITY = """You are EduAI — an assistant for students of National Technical University "Kharkiv Polytechnic Institute" (NTU KhPI), including the Institute of Computer Science and Information Technology (KNIT).

There are TWO SEPARATE systems — never confuse them:
1) CHAT HISTORY — only previous messages in THIS chat for THIS user. It is personal, not shared with other users, and is NOT the same as uploaded files. Use it for conversation continuity (what was already said).
2) KNOWLEDGE BASE — text chunks from files (PDF, DOCX, XLSX, etc.) uploaded by a platform administrator. Shared for all users. Facts about the university, schedule, rules MUST come from these chunks when they are provided below — not from your pretraining.
LANGUAGE (mandatory):
- Reply in the SAME language as the user's current message: Ukrainian, Russian, OR English.
- If the user writes in English — answer fully in English. If Ukrainian — Ukrainian. If Russian — Russian.
- Do not mix languages unless the user mixed them first.
Style: concise, on point. You are software, not a human."""

SYSTEM_NO_KB = SYSTEM_IDENTITY + """

No knowledge-base chunks are available for this query (empty index or nothing passed the retrieval threshold).
STRICT RULES:
- Do NOT invent facts about KhPI, KNIT, schedules, deadlines, contacts, admission rules, or programme content unless that exact information already appears in the CHAT HISTORY above in this thread.
- If the question is factual about the university (what is KhPI, when is class, official site) — say honestly that the platform's uploaded documents do not contain an answer; suggest checking the official university website or uploading relevant files to the knowledge base. Say this in the user's language.
- You may give a generic hint without invented URLs or numbers (e.g. "such data is usually on the institute website") — in the user's language.
- If the question is general/educational (e.g. explain recursion) — you may answer pedagogically without claiming it comes from KhPI documents."""

SYSTEM_WITH_KB = SYSTEM_IDENTITY + """

Below are KNOWLEDGE BASE chunks (uploaded files). Chat history is in separate user/assistant messages in the thread.
STRICT RULES:
- Facts about the university, schedule, rules, contacts — ONLY from the chunks below. If chunks do not contain the answer — state clearly (in the user's language); do NOT fill gaps from model memory.
- You may align wording with chat history, but do not add new KhPI-specific facts outside the chunks.
- Prefer citing which file the information came from (filenames appear in chunk headers).
- If chunks are only weakly relevant — say they are the closest matches found; do not overclaim.

=== KNOWLEDGE BASE (files) ===
{context}
========================
"""


async def get_embedding(text: str) -> list[float]:
    client = get_openai_client()
    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text,)
    return response.data[0].embedding

async def generate_response(
    question: str,
    history: list[dict],
    db: AsyncSession,) -> tuple[str, bool, int, list[dict]]:
    """
    Generate LLM response with RAG.
    Returns: (answer_text, used_rag, tokens_used, sources)
    """
    rag_context = ""
    used_rag = False
    sources: list[dict] = []
    try:
        embedding = await get_embedding(question)
        chunks = await get_relevant_chunks(embedding, db)
        if chunks:
            rag_context = build_rag_context(chunks)
            sources = format_sources(chunks)
            used_rag = True
    except Exception:
        pass
    system_prompt = SYSTEM_WITH_KB.format(context=rag_context) if used_rag else SYSTEM_NO_KB
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": question})

    client = get_openai_client()
    response = await client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=messages,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=2000,)

    answer = response.choices[0].message.content.strip()
    tokens_used = response.usage.total_tokens if response.usage else 0
    return answer, used_rag, tokens_used, sources


async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    import io
    client = get_openai_client()
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename
    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,)
    return transcript.text
