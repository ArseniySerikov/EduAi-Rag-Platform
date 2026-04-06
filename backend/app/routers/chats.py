from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.database import get_db
from app.models.user import User
from app.models.chat import Chat
from app.models.message import Message
from app.schemas.chat import ChatCreate, ChatUpdate, ChatOut
from app.utils.deps import get_current_user

router = APIRouter()


@router.get("", response_model=list[ChatOut])
async def list_chats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    result = await db.execute(
        select(Chat).where(Chat.user_id == current_user.id).order_by(Chat.updated_at.desc()))
    chats = result.scalars().all()
    out = []
    for chat in chats:
        count_result = await db.execute(
            select(func.count(Message.id)).where(Message.chat_id == chat.id))
        count = count_result.scalar_one()
        chat_out = ChatOut.model_validate(chat)
        chat_out.message_count = count
        out.append(chat_out)
    return out


@router.post("", response_model=ChatOut, status_code=status.HTTP_201_CREATED)
async def create_chat(
    payload: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    chat = Chat(user_id=current_user.id, title=payload.title or "Новый чат")
    db.add(chat)
    await db.flush()
    await db.refresh(chat)
    chat_out = ChatOut.model_validate(chat)
    chat_out.message_count = 0
    return chat_out


@router.get("/{chat_id}", response_model=ChatOut)
async def get_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    chat = await _get_owned_chat(chat_id, current_user.id, db)
    count_result = await db.execute(select(func.count(Message.id)).where(Message.chat_id == chat.id))
    chat_out = ChatOut.model_validate(chat)
    chat_out.message_count = count_result.scalar_one()
    return chat_out


@router.patch("/{chat_id}", response_model=ChatOut)
async def update_chat(
    chat_id: int,
    payload: ChatUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    chat = await _get_owned_chat(chat_id, current_user.id, db)
    chat.title = payload.title
    await db.flush()
    await db.refresh(chat)
    return ChatOut.model_validate(chat)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    chat = await _get_owned_chat(chat_id, current_user.id, db)
    await db.delete(chat)


async def _get_owned_chat(chat_id: int, user_id: int, db: AsyncSession) -> Chat:
    result = await db.execute(
        select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat
