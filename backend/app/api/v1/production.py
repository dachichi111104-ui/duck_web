from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import ProductionRecord, Flock, UserRole
from app.schemas.schemas import ProductionOut, ProductionCreate, ProductionUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=List[ProductionOut])
async def list_production_records(
    flock_id: Optional[int] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(ProductionRecord)
    if flock_id:
        query = query.where(ProductionRecord.flock_id == flock_id)
    query = query.order_by(ProductionRecord.record_date.desc()).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()

@router.post("", response_model=ProductionOut, status_code=status.HTTP_201_CREATED)
async def create_production_record(
    rec_in: ProductionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER, UserRole.STAFF]))
):
    flock = await db.get(Flock, rec_in.flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Đàn vịt không tồn tại")
    
    # Deduct mortality from current flock quantity
    if rec_in.mortality_count > 0:
        flock.current_quantity = max(0, flock.current_quantity - rec_in.mortality_count)

    record = ProductionRecord(**rec_in.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record
