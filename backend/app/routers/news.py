from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.news import News
from app.schemas.news import NewsCreate, NewsUpdate, NewsOut
from app.utils.deps import get_current_user, get_admin_user

router = APIRouter()

@router.get("", response_model=list[NewsOut])
async def list_news(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    query = select(News).order_by(News.created_at.desc())
    if current_user.role != "admin":
        query = query.where(News.is_published == True)  # noqa: E712
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=NewsOut, status_code=status.HTTP_201_CREATED)
async def create_news(
    payload: NewsCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    news = News(
        title=payload.title,
        content=payload.content,
        is_published=payload.is_published,
        author_id=current_user.id,)
    db.add(news)
    await db.flush()
    await db.refresh(news)
    return news


@router.patch("/{news_id}", response_model=NewsOut)
async def update_news(
    news_id: int,
    payload: NewsUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    result = await db.execute(select(News).where(News.id == news_id))
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    if payload.title is not None:
        news.title = payload.title
    if payload.content is not None:
        news.content = payload.content
    if payload.is_published is not None:
        news.is_published = payload.is_published
    await db.flush()
    await db.refresh(news)
    return news


@router.delete("/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_news(
    news_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    result = await db.execute(select(News).where(News.id == news_id))
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    await db.delete(news)
