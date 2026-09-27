from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import InventoryCategory, InventoryItem, InventoryTransaction, InventoryTransactionType, UserRole
from app.schemas.schemas import (
    InventoryCategoryOut, InventoryCategoryCreate, InventoryItemOut, InventoryItemCreate, InventoryItemUpdate,
    InventoryTransactionOut, InventoryTransactionCreate
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("/categories", response_model=List[InventoryCategoryOut])
async def list_categories(
    updated_since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(InventoryCategory)
    if updated_since:
        query = query.where(or_(InventoryCategory.updated_at >= updated_since, InventoryCategory.created_at >= updated_since))
    query = query.order_by(InventoryCategory.name.asc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/categories", response_model=InventoryCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    cat_in: InventoryCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    existing = await db.execute(select(InventoryCategory).where(InventoryCategory.name == cat_in.name))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail=f"Danh mục '{cat_in.name}' đã tồn tại")
    
    category = InventoryCategory(**cat_in.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.get("/items", response_model=List[InventoryItemOut])
async def list_items(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    updated_since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(InventoryItem).options(selectinload(InventoryItem.category))
    if category_id:
        query = query.where(InventoryItem.category_id == category_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(InventoryItem.name.ilike(pattern), InventoryItem.code.ilike(pattern)))
    if low_stock_only:
        query = query.where(InventoryItem.current_quantity <= InventoryItem.min_quantity)
    if updated_since:
        query = query.where(or_(InventoryItem.updated_at >= updated_since, InventoryItem.created_at >= updated_since))
        
    query = query.order_by(InventoryItem.name.asc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/items", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    item_in: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    existing = await db.execute(select(InventoryItem).where(InventoryItem.code == item_in.code))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail=f"Mã vật tư '{item_in.code}' đã tồn tại")
    
    item = InventoryItem(**item_in.model_dump())
    db.add(item)
    await db.commit()
    res = await db.execute(select(InventoryItem).options(selectinload(InventoryItem.category)).where(InventoryItem.id == item.id))
    return res.scalars().first()

@router.put("/items/{item_id}", response_model=InventoryItemOut)
async def update_item(
    item_id: int,
    item_in: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    item = await db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Vật tư không tồn tại")
    
    update_data = item_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(item, field, val)
        
    await db.commit()
    res = await db.execute(select(InventoryItem).options(selectinload(InventoryItem.category)).where(InventoryItem.id == item_id))
    return res.scalars().first()

@router.post("/transactions", response_model=InventoryTransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    tx_in: InventoryTransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    item = await db.get(InventoryItem, tx_in.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Vật tư không tồn tại")
    
    if tx_in.transaction_type == InventoryTransactionType.EXPORT and item.current_quantity < tx_in.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Số lượng tồn kho không đủ ({item.current_quantity} < {tx_in.quantity} {item.unit})"
        )

    if tx_in.transaction_type == InventoryTransactionType.IMPORT:
        item.current_quantity += tx_in.quantity
    elif tx_in.transaction_type == InventoryTransactionType.EXPORT:
        item.current_quantity -= tx_in.quantity
    elif tx_in.transaction_type == InventoryTransactionType.ADJUSTMENT:
        item.current_quantity = tx_in.quantity

    tx = InventoryTransaction(
        item_id=tx_in.item_id,
        transaction_type=tx_in.transaction_type,
        quantity=tx_in.quantity,
        performed_by=current_user.full_name,
        notes=tx_in.notes
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    
    res = await db.execute(
        select(InventoryTransaction)
        .options(selectinload(InventoryTransaction.item).selectinload(InventoryItem.category))
        .where(InventoryTransaction.id == tx.id)
    )
    return res.scalars().first()

@router.get("/transactions", response_model=List[InventoryTransactionOut])
async def list_transactions(
    item_id: Optional[int] = None,
    updated_since: Optional[datetime] = Query(None),
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(InventoryTransaction).options(selectinload(InventoryTransaction.item).selectinload(InventoryItem.category))
    if item_id:
        query = query.where(InventoryTransaction.item_id == item_id)
    if updated_since:
        query = query.where(or_(InventoryTransaction.updated_at >= updated_since, InventoryTransaction.created_at >= updated_since))
    query = query.order_by(InventoryTransaction.transaction_date.desc()).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()
