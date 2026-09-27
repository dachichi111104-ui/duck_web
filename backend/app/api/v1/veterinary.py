from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import VeterinaryRecord, Disease, Vaccination, UserRole, Flock
from app.schemas.schemas import (
    VetRecordOut, VetRecordCreate, VetRecordUpdate,
    DiseaseOut, VaccinationOut, VaccinationCreate, VaccinationUpdate
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("/diseases", response_model=List[DiseaseOut])
async def list_diseases(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    res = await db.execute(select(Disease).order_by(Disease.name.asc()))
    return res.scalars().all()

@router.get("/records", response_model=List[VetRecordOut])
async def list_vet_records(
    flock_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(VeterinaryRecord).options(
        selectinload(VeterinaryRecord.disease),
        selectinload(VeterinaryRecord.flock)
    )
    if flock_id:
        query = query.where(VeterinaryRecord.flock_id == flock_id)
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
        .options(selectinload(VeterinaryRecord.disease), selectinload(VeterinaryRecord.flock))
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
        .options(selectinload(VeterinaryRecord.disease), selectinload(VeterinaryRecord.flock))
        .where(VeterinaryRecord.id == record_id)
    )
    return res.scalars().first()

# ---- VACCINATIONS ----

@router.get("/vaccinations", response_model=List[VaccinationOut])
async def list_vaccinations(
    flock_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Vaccination).options(selectinload(Vaccination.flock))
    if flock_id:
        query = query.where(Vaccination.flock_id == flock_id)
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
        .options(selectinload(Vaccination.flock))
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
        .options(selectinload(Vaccination.flock))
        .where(Vaccination.id == vac_id)
    )
    return res.scalars().first()
