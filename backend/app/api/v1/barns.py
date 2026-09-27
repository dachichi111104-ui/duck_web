from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.models.models import Barn, Flock, UserRole
from app.schemas.schemas import BarnOut, BarnCreate, BarnUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=List[BarnOut])
async def list_barns(
    updated_since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Barn)
    if updated_since:
        query = query.where(or_(Barn.updated_at >= updated_since, Barn.created_at >= updated_since))
    query = query.order_by(Barn.code.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=BarnOut, status_code=status.HTTP_201_CREATED)
async def create_barn(
    barn_in: BarnCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    existing = await db.execute(select(Barn).where(Barn.code == barn_in.code))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail=f"Mã chuồng '{barn_in.code}' đã tồn tại")
    
    barn = Barn(**barn_in.model_dump())
    db.add(barn)
    await db.commit()
    await db.refresh(barn)
    return barn

@router.get("/{barn_id}", response_model=BarnOut)
async def get_barn(barn_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    barn = await db.get(Barn, barn_id)
    if not barn:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuồng nuôi")
    return barn

@router.put("/{barn_id}", response_model=BarnOut)
async def update_barn(
    barn_id: int,
    barn_in: BarnUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    barn = await db.get(Barn, barn_id)
    if not barn:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuồng nuôi")
    
    update_data = barn_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(barn, field, val)
        
    await db.commit()
    await db.refresh(barn)
    return barn

@router.delete("/{barn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_barn(
    barn_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN]))
):
    barn = await db.get(Barn, barn_id)
    if not barn:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuồng nuôi")
    
    flocks_res = await db.execute(select(Flock).where(Flock.barn_id == barn_id))
    active_flocks = flocks_res.scalars().all()
    if active_flocks:
        total_ducks = sum(f.current_quantity for f in active_flocks)
        raise HTTPException(
            status_code=400,
            detail=f"Không thể xóa chuồng '{barn.name}' vì đang có {len(active_flocks)} đàn vịt ({total_ducks} con) đang trú ngụ. Vui lòng di chuyển hoặc thanh lý các đàn vịt trước."
        )

    await db.delete(barn)
    await db.commit()
