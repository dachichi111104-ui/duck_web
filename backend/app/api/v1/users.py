from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.models import User, UserRole
from app.schemas.schemas import UserOut, UserCreate, UserUpdate
from app.api.deps import require_roles

router = APIRouter()

@router.get("", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN]))
):
    res = await db.execute(select(User).order_by(User.id.asc()))
    return res.scalars().all()

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN]))
):
    # Check duplicate username/email
    existing = await db.execute(select(User).where((User.username == user_in.username) | (User.email == user_in.email)))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc email đã được sử dụng")

    hashed_pw = get_password_hash(user_in.password)
    user_data = user_in.model_dump(exclude={"password"})
    user = User(**user_data, hashed_password=hashed_pw)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN]))
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.hashed_password = get_password_hash(update_data.pop("password"))

    for field, val in update_data.items():
        setattr(user, field, val)

    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN]))
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản Quản trị viên hệ thống (admin)")
    
    await db.delete(user)
    await db.commit()
