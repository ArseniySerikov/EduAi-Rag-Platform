from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.database import get_db
from app.models.user import User
from app.models.chat import Chat
from app.models.message import Message
from app.models.document import Document
from app.models.website_source import WebsiteSource
from app.schemas.user import UserOut
from app.schemas.chat import ChatOut
from app.utils.deps import get_admin_user

router = APIRouter()


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    users_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    chats_count = (await db.execute(select(func.count(Chat.id)))).scalar_one()
    messages_count = (await db.execute(select(func.count(Message.id)))).scalar_one()
    docs_count = (await db.execute(select(func.count(Document.id)))).scalar_one()
    websites_count = (await db.execute(select(func.count(WebsiteSource.id)))).scalar_one()
    rag_count = (
        await db.execute(select(func.count(Message.id)).where(Message.used_rag == True))  # noqa: E712
    ).scalar_one()
    total_tokens = (await db.execute(select(func.sum(Message.tokens_used)))).scalar_one() or 0
    return {
        "users": users_count,
        "chats": chats_count,
        "messages": messages_count,
        "documents": docs_count,
        "websites": websites_count,
        "rag_requests": rag_count,
        "total_tokens": total_tokens,
    }


@router.get("/users", response_model=list[UserOut])
async def list_users(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/users/{user_id}/toggle-active", response_model=UserOut)
async def toggle_user_active(
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/users/{user_id}/chats", response_model=list[ChatOut])
async def get_user_chats(
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    result = await db.execute(
        select(Chat).where(Chat.user_id == user_id).order_by(Chat.updated_at.desc())
    )
    chats = result.scalars().all()
    out = []
    for chat in chats:
        count_result = await db.execute(
            select(func.count(Message.id)).where(Message.chat_id == chat.id)
        )
        chat_out = ChatOut.model_validate(chat)
        chat_out.message_count = count_result.scalar_one()
        out.append(chat_out)
    return out


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
