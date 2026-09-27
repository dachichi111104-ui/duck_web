from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Camera, Barn, UserRole
from app.schemas.schemas import CameraOut, CameraCreate, CameraUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=List[CameraOut])
async def list_cameras(
    barn_id: Optional[int] = None,
    updated_since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Camera).options(selectinload(Camera.barn))
    if barn_id:
        query = query.where(Camera.barn_id == barn_id)
    if updated_since:
        query = query.where(or_(Camera.updated_at >= updated_since, Camera.created_at >= updated_since))
    query = query.order_by(Camera.id.asc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("", response_model=CameraOut, status_code=status.HTTP_201_CREATED)
async def create_camera(
    cam_in: CameraCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    barn = await db.get(Barn, cam_in.barn_id)
    if not barn:
        raise HTTPException(status_code=404, detail="Chuồng nuôi không tồn tại")

    camera = Camera(**cam_in.model_dump())
    db.add(camera)
    await db.commit()
    
    res = await db.execute(select(Camera).options(selectinload(Camera.barn)).where(Camera.id == camera.id))
    return res.scalars().first()

@router.put("/{camera_id}", response_model=CameraOut)
async def update_camera(
    camera_id: int,
    cam_in: CameraUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Không tìm thấy Camera")

    update_data = cam_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(camera, field, val)

    await db.commit()
    res = await db.execute(select(Camera).options(selectinload(Camera.barn)).where(Camera.id == camera_id))
    return res.scalars().first()

@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER]))
):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Không tìm thấy Camera")

    await db.delete(camera)
    await db.commit()
