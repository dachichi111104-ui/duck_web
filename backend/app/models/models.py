import enum
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Float, Text, Boolean, DateTime, Date, ForeignKey, Enum, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    FARM_MANAGER = "FARM_MANAGER"
    VETERINARIAN = "VETERINARIAN"
    STAFF = "STAFF"

class FlockStatus(str, enum.Enum):
    BROODING = "BROODING"       # Úm vịt
    GROWING = "GROWING"         # Nuôi thịt/hậu bị
    LAYING = "LAYING"           # Đẻ trứng
    COMPLETED = "COMPLETED"     # Đã xuất bán / thanh lý

class InventoryTransactionType(str, enum.Enum):
    IMPORT = "IMPORT"
    EXPORT = "EXPORT"
    ADJUSTMENT = "ADJUSTMENT"

class VetRecordStatus(str, enum.Enum):
    MONITORING = "MONITORING"
    TREATING = "TREATING"
    RECOVERED = "RECOVERED"
    CULLED = "CULLED"

class VaccinationStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"

class AIAlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AIAlertStatus(str, enum.Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"

# ---- MODELS ----

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.STAFF, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Barn(Base):
    __tablename__ = "barns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    current_occupancy: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE") # ACTIVE, MAINTENANCE, CLEANING
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    flocks: Mapped[List["Flock"]] = relationship("Flock", back_populates="barn")
    ai_sessions: Mapped[List["AIAnalysisSession"]] = relationship("AIAnalysisSession", back_populates="barn")
    cameras: Mapped[List["Camera"]] = relationship("Camera", back_populates="barn", cascade="all, delete-orphan")

class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(30), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    barn_id: Mapped[int] = mapped_column(Integer, ForeignKey("barns.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ONLINE") # ONLINE, OFFLINE, MAINTENANCE
    rtsp_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    barn: Mapped["Barn"] = relationship("Barn", back_populates="cameras")

class Flock(Base):
    __tablename__ = "flocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    barn_id: Mapped[int] = mapped_column(Integer, ForeignKey("barns.id"), nullable=False)
    initial_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    current_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    age_weeks: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[FlockStatus] = mapped_column(Enum(FlockStatus), default=FlockStatus.GROWING)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    barn: Mapped["Barn"] = relationship("Barn", back_populates="flocks")
    events: Mapped[List["FlockEvent"]] = relationship("FlockEvent", back_populates="flock", cascade="all, delete-orphan")
    production_records: Mapped[List["ProductionRecord"]] = relationship("ProductionRecord", back_populates="flock", cascade="all, delete-orphan")
    vet_records: Mapped[List["VeterinaryRecord"]] = relationship("VeterinaryRecord", back_populates="flock", cascade="all, delete-orphan")
    vaccinations: Mapped[List["Vaccination"]] = relationship("Vaccination", back_populates="flock", cascade="all, delete-orphan")
    ai_sessions: Mapped[List["AIAnalysisSession"]] = relationship("AIAnalysisSession", back_populates="flock", cascade="all, delete-orphan")
    ai_alerts: Mapped[List["AIAlert"]] = relationship("AIAlert", back_populates="flock", cascade="all, delete-orphan")

class FlockEvent(Base):
    __tablename__ = "flock_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    flock_id: Mapped[int] = mapped_column(Integer, ForeignKey("flocks.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False) # MOVE, FEED_CHANGE, WEIGHING, CULLING
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity_affected: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    flock: Mapped["Flock"] = relationship("Flock", back_populates="events")

class ProductionRecord(Base):
    __tablename__ = "production_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    flock_id: Mapped[int] = mapped_column(Integer, ForeignKey("flocks.id"), nullable=False)
    record_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    eggs_collected: Mapped[int] = mapped_column(Integer, default=0)
    mortality_count: Mapped[int] = mapped_column(Integer, default=0)
    feed_consumed_kg: Mapped[float] = mapped_column(Float, default=0.0)
    weight_avg_gram: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    flock: Mapped["Flock"] = relationship("Flock", back_populates="production_records")

class InventoryCategory(Base):
    __tablename__ = "inventory_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False) # Thức ăn, Thuốc, Vắc xin, Thiết bị
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items: Mapped[List["InventoryItem"]] = relationship("InventoryItem", back_populates="category")

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("inventory_categories.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False) # kg, liều, bao, chai
    min_quantity: Mapped[float] = mapped_column(Float, default=10.0)
    current_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    cost_per_unit: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category: Mapped["InventoryCategory"] = relationship("InventoryCategory", back_populates="items")
    transactions: Mapped[List["InventoryTransaction"]] = relationship("InventoryTransaction", back_populates="item", cascade="all, delete-orphan")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    transaction_type: Mapped[InventoryTransactionType] = mapped_column(Enum(InventoryTransactionType), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    transaction_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    performed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="transactions")

class Disease(Base):
    __tablename__ = "diseases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False) # Dịch tả vịt, Cúm gia cầm H5N1, Viêm gan do virus
    symptoms: Mapped[str] = mapped_column(Text, nullable=False)
    treatment: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vet_records: Mapped[List["VeterinaryRecord"]] = relationship("VeterinaryRecord", back_populates="disease")

class VeterinaryRecord(Base):
    __tablename__ = "veterinary_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    flock_id: Mapped[int] = mapped_column(Integer, ForeignKey("flocks.id"), nullable=False)
    disease_id: Mapped[int] = mapped_column(Integer, ForeignKey("diseases.id"), nullable=False)
    diagnosis_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[VetRecordStatus] = mapped_column(Enum(VetRecordStatus), default=VetRecordStatus.MONITORING)
    affected_count: Mapped[int] = mapped_column(Integer, default=0)
    treatment_plan: Mapped[str] = mapped_column(Text, nullable=False)
    veterinarian_name: Mapped[str] = mapped_column(String(100), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    flock: Mapped["Flock"] = relationship("Flock", back_populates="vet_records")
    disease: Mapped["Disease"] = relationship("Disease", back_populates="vet_records")

class Vaccination(Base):
    __tablename__ = "vaccinations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    flock_id: Mapped[int] = mapped_column(Integer, ForeignKey("flocks.id"), nullable=False)
    vaccine_name: Mapped[str] = mapped_column(String(100), nullable=False)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    administered_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[VaccinationStatus] = mapped_column(Enum(VaccinationStatus), default=VaccinationStatus.SCHEDULED)
    dosage: Mapped[str] = mapped_column(String(50), nullable=False) # 0.5 ml/con
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    flock: Mapped["Flock"] = relationship("Flock", back_populates="vaccinations")

class AIAnalysisSession(Base):
    __tablename__ = "ai_analysis_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    flock_id: Mapped[int] = mapped_column(Integer, ForeignKey("flocks.id"), nullable=False)
    barn_id: Mapped[int] = mapped_column(Integer, ForeignKey("barns.id"), nullable=False)
    session_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    video_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    total_ducks_detected: Mapped[int] = mapped_column(Integer, default=0)
    abnormal_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED") # COMPLETED, PROCESSING, FAILED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    flock: Mapped["Flock"] = relationship("Flock", back_populates="ai_sessions")
    barn: Mapped["Barn"] = relationship("Barn", back_populates="ai_sessions")
    detection_results: Mapped[List["AIDetectionResult"]] = relationship("AIDetectionResult", back_populates="session", cascade="all, delete-orphan")
    alerts: Mapped[List["AIAlert"]] = relationship("AIAlert", back_populates="session", cascade="all, delete-orphan")

class AIDetectionResult(Base):
    __tablename__ = "ai_detection_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("ai_analysis_sessions.id"), nullable=False)
    frame_index: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp_sec: Mapped[float] = mapped_column(Float, nullable=False)
    track_id: Mapped[int] = mapped_column(Integer, nullable=False)
    behavior_label: Mapped[str] = mapped_column(String(50), nullable=False) # NORMAL, LETHARGIC, ISOLATED, FEVER_GROUPING
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_x: Mapped[float] = mapped_column(Float, nullable=False) # normalized 0..1 or pixel
    bbox_y: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_w: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_h: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session: Mapped["AIAnalysisSession"] = relationship("AIAnalysisSession", back_populates="detection_results")

class AIAlert(Base):
    __tablename__ = "ai_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("ai_analysis_sessions.id"), nullable=True)
    flock_id: Mapped[int] = mapped_column(Integer, ForeignKey("flocks.id"), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False) # LETHARGY_DETECTED, FEVER_CLUSTER, ANOMALOUS_MOVEMENT
    severity: Mapped[AIAlertSeverity] = mapped_column(Enum(AIAlertSeverity), default=AIAlertSeverity.WARNING)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[AIAlertStatus] = mapped_column(Enum(AIAlertStatus), default=AIAlertStatus.NEW)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session: Mapped[Optional["AIAnalysisSession"]] = relationship("AIAnalysisSession", back_populates="alerts")
    flock: Mapped["Flock"] = relationship("Flock", back_populates="ai_alerts")

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="notifications")
