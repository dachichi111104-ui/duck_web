from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Flock, Barn, UserRole, FlockEvent
from app.schemas.schemas import FlockOut, FlockCreate, FlockUpdate, FlockEventOut, FlockEventCreate
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=dict)
async def list_flocks(
    search: Optional[str] = None,
    status: Optional[str] = None,
    barn_id: Optional[int] = None,
    updated_since: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Flock).options(selectinload(Flock.barn))
    
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Flock.name.ilike(pattern), Flock.code.ilike(pattern)))
    if status:
        query = query.where(Flock.status == status)
    if barn_id:
        query = query.where(Flock.barn_id == barn_id)
    if updated_since:
        query = query.where(or_(Flock.updated_at >= updated_since, Flock.created_at >= updated_since))

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginate
    query = query.order_by(Flock.id.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(query)
    flocks = res.scalars().all()

    return {
        "data": [FlockOut.model_validate(f) for f in flocks],
        "total": total,
        "page": page,
        "limit": limit
    }

@router.post("", response_model=FlockOut, status_code=status.HTTP_201_CREATED)
async def create_flock(
    flock_in: FlockCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    existing = await db.execute(select(Flock).where(Flock.code == flock_in.code))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail=f"Mã đàn '{flock_in.code}' đã tồn tại")

    barn = await db.get(Barn, flock_in.barn_id)
    if not barn:
        raise HTTPException(status_code=404, detail="Chuồng nuôi không tồn tại")
    
    if barn.current_occupancy + flock_in.initial_quantity > barn.capacity:
        raise HTTPException(
            status_code=400,
            detail=f"Sức chứa chuồng {barn.name} vượt quá giới hạn! (Sức chứa: {barn.capacity}, Hiện tại: {barn.current_occupancy}, Thêm: {flock_in.initial_quantity})"
        )

    flock = Flock(**flock_in.model_dump())
    db.add(flock)
    
    barn.current_occupancy += flock.initial_quantity
    
    await db.commit()
    
    res = await db.execute(select(Flock).options(selectinload(Flock.barn)).where(Flock.id == flock.id))
    return res.scalars().first()

@router.get("/{flock_id}", response_model=FlockOut)
async def get_flock(flock_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    res = await db.execute(select(Flock).options(selectinload(Flock.barn)).where(Flock.id == flock_id))
    flock = res.scalars().first()
    if not flock:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đàn vịt")
    return flock

@router.put("/{flock_id}", response_model=FlockOut)
async def update_flock(
    flock_id: int,
    flock_in: FlockUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    flock = await db.get(Flock, flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Không tìm thấy đàn vịt")
    
    update_data = flock_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(flock, field, val)
        
    await db.commit()
    res = await db.execute(select(Flock).options(selectinload(Flock.barn)).where(Flock.id == flock_id))
    return res.scalars().first()

@router.delete("/{flock_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flock(
    flock_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN]))
):
    flock = await db.get(Flock, flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Không tìm thấy đàn vịt")
    
    barn = await db.get(Barn, flock.barn_id)
    if barn:
        barn.current_occupancy = max(0, barn.current_occupancy - flock.current_quantity)

    await db.delete(flock)
    await db.commit()

# ---- FLOCK EVENTS SUB-ROUTER ----

@router.get("/{flock_id}/events", response_model=List[FlockEventOut])
async def list_flock_events(
    flock_id: int,
    updated_since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    flock = await db.get(Flock, flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Đàn vịt không tồn tại")
    
    query = select(FlockEvent).options(selectinload(FlockEvent.flock).selectinload(Flock.barn)).where(FlockEvent.flock_id == flock_id)
    if updated_since:
        query = query.where(or_(FlockEvent.updated_at >= updated_since, FlockEvent.created_at >= updated_since))
    
    query = query.order_by(FlockEvent.event_date.desc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/{flock_id}/events", response_model=FlockEventOut, status_code=status.HTTP_201_CREATED)
async def create_flock_event(
    flock_id: int,
    event_in: FlockEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER, UserRole.STAFF]))
):
    flock = await db.get(Flock, flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Đàn vịt không tồn tại")
    
    event_data = event_in.model_dump()
    event_data["flock_id"] = flock_id
    event = FlockEvent(**event_data)
    db.add(event)
    await db.commit()

    res = await db.execute(
        select(FlockEvent)
        .options(selectinload(FlockEvent.flock).selectinload(Flock.barn))
        .where(FlockEvent.id == event.id)
    )
    return res.scalars().first()
