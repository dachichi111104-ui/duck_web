from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import VeterinaryRecord, Disease, Vaccination, UserRole, Flock
from app.schemas.schemas import (
    VetRecordOut, VetRecordCreate, VetRecordUpdate,
    DiseaseOut, DiseaseCreate, VaccinationOut, VaccinationCreate, VaccinationUpdate
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("/diseases", response_model=List[DiseaseOut])
async def list_diseases(
    updated_since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Disease)
    if updated_since:
        query = query.where(or_(Disease.updated_at >= updated_since, Disease.created_at >= updated_since))
    query = query.order_by(Disease.name.asc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/diseases", response_model=DiseaseOut, status_code=status.HTTP_201_CREATED)
async def create_disease(
    disease_in: DiseaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER, UserRole.VETERINARIAN]))
):
    existing = await db.execute(select(Disease).where(Disease.code == disease_in.code))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail=f"Mã bệnh '{disease_in.code}' đã tồn tại")

    disease = Disease(**disease_in.model_dump())
    db.add(disease)
    await db.commit()
    await db.refresh(disease)
    return disease

@router.get("/records", response_model=List[VetRecordOut])
async def list_vet_records(
    flock_id: Optional[int] = None,
    updated_since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(VeterinaryRecord).options(
        selectinload(VeterinaryRecord.disease),
        selectinload(VeterinaryRecord.flock).selectinload(Flock.barn)
    )
    if flock_id:
        query = query.where(VeterinaryRecord.flock_id == flock_id)
    if updated_since:
        query = query.where(or_(VeterinaryRecord.updated_at >= updated_since, VeterinaryRecord.created_at >= updated_since))
    query = query.order_by(VeterinaryRecord.diagnosis_date.desc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/records", response_model=VetRecordOut, status_code=status.HTTP_201_CREATED)
async def create_vet_record(
    rec_in: VetRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER, UserRole.VETERINARIAN]))
):
    flock = await db.get(Flock, rec_in.flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Đàn vịt không tồn tại")
    disease = await db.get(Disease, rec_in.disease_id)
    if not disease:
        raise HTTPException(status_code=404, detail="Bệnh không tồn tại")

    record = VeterinaryRecord(**rec_in.model_dump())
    db.add(record)
    await db.commit()
    
    res = await db.execute(
        select(VeterinaryRecord)
        .options(
            selectinload(VeterinaryRecord.disease),
            selectinload(VeterinaryRecord.flock).selectinload(Flock.barn)
        )
        .where(VeterinaryRecord.id == record.id)
    )
    return res.scalars().first()

@router.put("/records/{record_id}", response_model=VetRecordOut)
async def update_vet_record(
    record_id: int,
    rec_in: VetRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER, UserRole.VETERINARIAN]))
):
    record = await db.get(VeterinaryRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Bệnh án không tồn tại")
    
    update_data = rec_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(record, field, val)
        
    await db.commit()
    res = await db.execute(
        select(VeterinaryRecord)
        .options(
            selectinload(VeterinaryRecord.disease),
            selectinload(VeterinaryRecord.flock).selectinload(Flock.barn)
        )
        .where(VeterinaryRecord.id == record_id)
    )
    return res.scalars().first()

# ---- VACCINATIONS ----

@router.get("/vaccinations", response_model=List[VaccinationOut])
async def list_vaccinations(
    flock_id: Optional[int] = None,
    updated_since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Vaccination).options(selectinload(Vaccination.flock).selectinload(Flock.barn))
    if flock_id:
        query = query.where(Vaccination.flock_id == flock_id)
    if updated_since:
        query = query.where(or_(Vaccination.updated_at >= updated_since, Vaccination.created_at >= updated_since))
    query = query.order_by(Vaccination.scheduled_date.asc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/vaccinations", response_model=VaccinationOut, status_code=status.HTTP_201_CREATED)
async def create_vaccination(
    vac_in: VaccinationCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER, UserRole.VETERINARIAN]))
):
    flock = await db.get(Flock, vac_in.flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Đàn vịt không tồn tại")
    
    vac = Vaccination(**vac_in.model_dump())
    db.add(vac)
    await db.commit()
    
    res = await db.execute(
        select(Vaccination)
        .options(selectinload(Vaccination.flock).selectinload(Flock.barn))
        .where(Vaccination.id == vac.id)
    )
    return res.scalars().first()

@router.put("/vaccinations/{vac_id}", response_model=VaccinationOut)
async def update_vaccination(
    vac_id: int,
    vac_in: VaccinationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.FARM_MANAGER, UserRole.VETERINARIAN]))
):
    vac = await db.get(Vaccination, vac_id)
    if not vac:
        raise HTTPException(status_code=404, detail="Lịch tiêm phòng không tồn tại")
    
    update_data = vac_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(vac, field, val)
        
    await db.commit()
    res = await db.execute(
        select(Vaccination)
        .options(selectinload(Vaccination.flock).selectinload(Flock.barn))
        .where(Vaccination.id == vac_id)
    )
    return res.scalars().first()
