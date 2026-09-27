from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import Barn, UserRole
from app.schemas.schemas import BarnOut, BarnCreate, BarnUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=List[BarnOut])
async def list_barns(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Barn).order_by(Barn.code.asc()))
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
    await db.delete(barn)
    await db.commit()
