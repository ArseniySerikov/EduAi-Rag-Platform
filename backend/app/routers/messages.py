from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.chat import Chat
from app.models.message import Message
from app.schemas.message import MessageSend, MessageOut, message_to_out
from app.utils.deps import get_current_user
from app.services.llm_service import generate_response, transcribe_audio

router = APIRouter()

@router.get("/{chat_id}", response_model=list[MessageOut])
async def get_messages(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    await _verify_chat_ownership(chat_id, current_user.id, db)
    result = await db.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.asc()))
    return [message_to_out(m) for m in result.scalars().all()]


@router.post("/{chat_id}", response_model=MessageOut)
async def send_message(
    chat_id: int,
    payload: MessageSend,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    chat = await _verify_chat_ownership(chat_id, current_user.id, db)

    user_message = Message(
        chat_id=chat_id,
        role="user",
        content=payload.content,)
    db.add(user_message)
    await db.flush()

    history_result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc()))
    history_messages = history_result.scalars().all()
    history = [
        {"role": m.role, "content": m.content}
        for m in history_messages
        if m.id != user_message.id]

    answer, used_rag, tokens_used, sources = await generate_response(
        question=payload.content,
        history=history,
        db=db,)

    first_user_messages = [m for m in history_messages if m.role == "user" and m.id != user_message.id]
    if len(first_user_messages) == 0 and chat.title in (
        "Новый чат",
        "Новий чат",
        "New chat",):
        chat.title = payload.content[:60] + ("..." if len(payload.content) > 60 else "")
        await db.flush()

    assistant_message = Message(
        chat_id=chat_id,
        role="assistant",
        content=answer,
        used_rag=used_rag,
        tokens_used=tokens_used,
        rag_sources=sources if sources else None,)
    db.add(assistant_message)
    await db.flush()
    await db.refresh(assistant_message)

    return message_to_out(assistant_message)


@router.post("/{chat_id}/voice", response_model=dict)
async def voice_to_text(
    chat_id: int,
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    await _verify_chat_ownership(chat_id, current_user.id, db)
    content = await audio.read()
    text = await transcribe_audio(content, audio.filename or "audio.webm")
    return {"text": text}


async def _verify_chat_ownership(chat_id: int, user_id: int, db: AsyncSession) -> Chat:
    result = await db.execute(
        select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat
