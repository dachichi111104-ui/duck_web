from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import FlockEvent, Flock, UserRole
from app.schemas.schemas import FlockEventOut, FlockEventCreate, FlockEventUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=List[FlockEventOut])
async def list_all_flock_events(
    flock_id: Optional[int] = None,
    updated_since: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(FlockEvent).options(selectinload(FlockEvent.flock).selectinload(Flock.barn))
    if flock_id:
        query = query.where(FlockEvent.flock_id == flock_id)
    if updated_since:
        query = query.where(or_(FlockEvent.updated_at >= updated_since, FlockEvent.created_at >= updated_since))
    
    query = query.order_by(FlockEvent.event_date.desc()).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()

@router.post("", response_model=FlockEventOut, status_code=status.HTTP_201_CREATED)
async def create_flock_event_standalone(
    event_in: FlockEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER, UserRole.STAFF]))
):
    flock = await db.get(Flock, event_in.flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Đàn vịt không tồn tại")
    
    event = FlockEvent(**event_in.model_dump())
    db.add(event)
    await db.commit()
    
    res = await db.execute(
        select(FlockEvent)
        .options(selectinload(FlockEvent.flock).selectinload(Flock.barn))
        .where(FlockEvent.id == event.id)
    )
    return res.scalars().first()

@router.get("/{event_id}", response_model=FlockEventOut)
async def get_flock_event(event_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    res = await db.execute(
        select(FlockEvent)
        .options(selectinload(FlockEvent.flock).selectinload(Flock.barn))
        .where(FlockEvent.id == event_id)
    )
    event = res.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự kiện theo dõi đàn")
    return event
