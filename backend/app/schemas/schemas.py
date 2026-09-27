from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
from app.models.models import UserRole, FlockStatus, InventoryTransactionType, VetRecordStatus, VaccinationStatus, AIAlertSeverity, AIAlertStatus

# ---- AUTH & USER ----

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: UserRole = UserRole.STAFF
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ---- BARN ----

class BarnBase(BaseModel):
    code: str
    name: str
    capacity: int
    status: str = "ACTIVE"
    description: Optional[str] = None

class BarnCreate(BarnBase):
    pass

class BarnUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None
    description: Optional[str] = None

class BarnOut(BarnBase):
    id: int
    current_occupancy: int
    created_at: datetime

    class Config:
        from_attributes = True

# ---- CAMERA ----

class CameraBase(BaseModel):
    name: str
    barn_id: int
    status: str = "ONLINE"
    rtsp_url: Optional[str] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    barn_id: Optional[int] = None
    status: Optional[str] = None
    rtsp_url: Optional[str] = None

class CameraOut(CameraBase):
    id: int
    created_at: datetime
    barn: Optional[BarnOut] = None

    class Config:
        from_attributes = True

# ---- NOTIFICATION ----

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ---- FLOCK ----

class FlockBase(BaseModel):
    code: str
    name: str
    barn_id: int
    initial_quantity: int
    current_quantity: int
    age_weeks: int = 1
    status: FlockStatus = FlockStatus.GROWING
    entry_date: date
    description: Optional[str] = None

class FlockCreate(FlockBase):
    pass

class FlockUpdate(BaseModel):
    name: Optional[str] = None
    barn_id: Optional[int] = None
    current_quantity: Optional[int] = None
    age_weeks: Optional[int] = None
    status: Optional[FlockStatus] = None
    description: Optional[str] = None

class FlockOut(FlockBase):
    id: int
    created_at: datetime
    barn: Optional[BarnOut] = None

    class Config:
        from_attributes = True

# ---- PRODUCTION ----

class ProductionBase(BaseModel):
    flock_id: int
    record_date: date
    eggs_collected: int = 0
    mortality_count: int = 0
    feed_consumed_kg: float = 0.0
    weight_avg_gram: float = 0.0
    notes: Optional[str] = None

class ProductionCreate(ProductionBase):
    pass

class ProductionUpdate(BaseModel):
    eggs_collected: Optional[int] = None
    mortality_count: Optional[int] = None
    feed_consumed_kg: Optional[float] = None
    weight_avg_gram: Optional[float] = None
    notes: Optional[str] = None

class ProductionOut(ProductionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ---- INVENTORY ----

class InventoryCategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class InventoryItemBase(BaseModel):
    category_id: int
    code: str
    name: str
    unit: str
    min_quantity: float = 10.0
    current_quantity: float = 0.0
    expiry_date: Optional[date] = None
    cost_per_unit: float = 0.0
    notes: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    min_quantity: Optional[float] = None
    current_quantity: Optional[float] = None
    expiry_date: Optional[date] = None
    cost_per_unit: Optional[float] = None
    notes: Optional[str] = None

class InventoryItemOut(InventoryItemBase):
    id: int
    category: Optional[InventoryCategoryOut] = None

    class Config:
        from_attributes = True

class InventoryTransactionCreate(BaseModel):
    item_id: int
    transaction_type: InventoryTransactionType
    quantity: float
    notes: Optional[str] = None

class InventoryTransactionOut(BaseModel):
    id: int
    item_id: int
    transaction_type: InventoryTransactionType
    quantity: float
    transaction_date: datetime
    performed_by: str
    notes: Optional[str] = None
    item: Optional[InventoryItemOut] = None

    class Config:
        from_attributes = True

# ---- VETERINARY & VACCINATION ----

class DiseaseOut(BaseModel):
    id: int
    code: str
    name: str
    symptoms: str
    treatment: str
    severity: str

    class Config:
        from_attributes = True

class VetRecordBase(BaseModel):
    flock_id: int
    disease_id: int
    diagnosis_date: date
    status: VetRecordStatus = VetRecordStatus.MONITORING
    affected_count: int = 0
    treatment_plan: str
    veterinarian_name: str
    notes: Optional[str] = None

class VetRecordCreate(VetRecordBase):
    pass

class VetRecordUpdate(BaseModel):
    status: Optional[VetRecordStatus] = None
    affected_count: Optional[int] = None
    treatment_plan: Optional[str] = None
    notes: Optional[str] = None

class VetRecordOut(VetRecordBase):
    id: int
    created_at: datetime
    disease: Optional[DiseaseOut] = None
    flock: Optional[FlockOut] = None

    class Config:
        from_attributes = True

class VaccinationBase(BaseModel):
    flock_id: int
    vaccine_name: str
    scheduled_date: date
    administered_date: Optional[date] = None
    status: VaccinationStatus = VaccinationStatus.SCHEDULED
    dosage: str
    notes: Optional[str] = None

class VaccinationCreate(VaccinationBase):
    pass

class VaccinationUpdate(BaseModel):
    administered_date: Optional[date] = None
    status: Optional[VaccinationStatus] = None
    notes: Optional[str] = None

class VaccinationOut(VaccinationBase):
    id: int
    created_at: datetime
    flock: Optional[FlockOut] = None

    class Config:
        from_attributes = True

# ---- AI ANALYSIS ----

class AIDetectionTrack(BaseModel):
    frame_index: int
    timestamp_sec: float
    track_id: int
    behavior_label: str  # NORMAL, LETHARGIC, ISOLATED, FEVER_GROUPING
    confidence: float
    bbox: List[float]    # [x, y, w, h] normalized 0..1

class AIAnalyzeResponse(BaseModel):
    session_id: int
    flock_id: int
    barn_id: int
    video_filename: str
    duration_seconds: float
    total_ducks_detected: int
    abnormal_count: int
    behavior_summary: dict
    tracks: List[AIDetectionTrack]
    alerts_generated: List[str]

class AIAlertOut(BaseModel):
    id: int
    session_id: Optional[int]
    flock_id: int
    alert_type: str
    severity: AIAlertSeverity
    message: str
    timestamp: datetime
    status: AIAlertStatus
    flock: Optional[FlockOut] = None

    class Config:
        from_attributes = True

# ---- DASHBOARD & REPORTS ----

class DashboardStats(BaseModel):
    total_flocks: int
    total_ducks: int
    total_barns: int
    today_eggs: int
    today_mortality: int
    active_alerts_count: int
    low_stock_items_count: int
    upcoming_vaccinations_count: int

Token.model_rebuild()
