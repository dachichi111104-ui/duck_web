from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import Notification, User
from app.schemas.schemas import NotificationOut
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[NotificationOut])
@router.get("/", response_model=List[NotificationOut])
async def get_user_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Notification).where(
        (Notification.user_id == current_user.id) | (Notification.user_id == 0)
    ).order_by(Notification.created_at.desc()).limit(20)
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/unread-count")
@router.get("/unread-count/")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Notification).where(
        ((Notification.user_id == current_user.id) | (Notification.user_id == 0)) & (Notification.is_read == False)
    )
    res = await db.execute(query)
    items = res.scalars().all()
    return {"unread_count": len(items), "count": len(items)}

@router.put("/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = await db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification
