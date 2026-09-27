from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Flock, Barn, UserRole, ProductionRecord, VeterinaryRecord, Vaccination, AIAnalysisSession
from app.schemas.schemas import FlockOut, FlockCreate, FlockUpdate, ProductionOut, VetRecordOut, VaccinationOut
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=dict)
async def list_flocks(
    search: Optional[str] = None,
    status: Optional[str] = None,
    barn_id: Optional[int] = None,
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
    # Check duplicate code
    existing = await db.execute(select(Flock).where(Flock.code == flock_in.code))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail=f"Mã đàn '{flock_in.code}' đã tồn tại")

    # Check barn capacity
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
    
    # Update barn occupancy
    barn.current_occupancy += flock.initial_quantity
    
    await db.commit()
    
    # Re-query with loaded barn
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
    
    # Reduce occupancy in barn
    barn = await db.get(Barn, flock.barn_id)
    if barn:
        barn.current_occupancy = max(0, barn.current_occupancy - flock.current_quantity)

    await db.delete(flock)
    await db.commit()
