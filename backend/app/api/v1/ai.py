import os
import random
import math
import shutil
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import AIAnalysisSession, AIDetectionResult, AIAlert, AIAlertSeverity, AIAlertStatus, Flock, Barn, Notification
from app.schemas.schemas import (
    AIAnalyzeResponse, AIDetectionTrack, AIAlertOut,
    AIAnalysisSessionOut, AIAnalysisSessionCreate,
    AIDetectionResultOut, AIDetectionResultCreate
)
from app.api.deps import get_current_user
try:
    from app.services.duck_detector import analyze_video_full_pipeline
    HAS_PIPELINE = True
except Exception as e:
    HAS_PIPELINE = False
    analyze_video_full_pipeline = None

router = APIRouter()

def generate_duck_behavior_simulation(flock_id: int, barn_id: int, filename: str) -> tuple[List[dict], dict, int, int]:
    """
    Tạo dữ liệu mô phỏng theo dõi quỹ đạo & chuỗi hành vi của đàn vịt qua Video.
    Hỗ trợ phát hiện:
    - NORMAL: Vịt sinh hoạt bình thường
    - SUPINE_FLIPPED: Vịt nằm lật ngửa / co giật chân (Nghi Viêm gan siêu vi DVH / Bại liệt)
    - ISOLATED_LOW_MOBILITY: Vịt tách đàn & ít vận động kéo dài liên tục >= 40s (Cảnh báo sớm Dịch tả / Tụ huyết trùng)
    - LETHARGIC: Vịt ủ rũ / ít vận động so với bầy
    - ISOLATED: Vịt tách đàn đơn lẻ
    """
    random.seed(flock_id * 100 + len(filename))
    
    num_ducks = 12
    fps = 5
    duration_sec = 15.0
    total_frames = int(duration_sec * fps)
    
    tracks = []
    ducks = []
    
    for tid in range(1, num_ducks + 1):
        if tid == 2:
            behavior = "SUPINE_FLIPPED"  # Nghi lật ngửa / Co giật
        elif tid == 5:
            behavior = "ISOLATED_LOW_MOBILITY"  # Tách đàn & giảm vận động kéo dài (>=40s)
        elif tid == 8:
            behavior = "LETHARGIC"  # Ủ rũ / ít vận động
        elif tid == 11:
            behavior = "ISOLATED"  # Tách đàn
        else:
            behavior = "NORMAL"

        base_x = 0.15 + (tid % 4) * 0.2 + random.uniform(-0.03, 0.03)
        base_y = 0.2 + (tid // 4) * 0.22 + random.uniform(-0.03, 0.03)
        w = 0.09
        h = 0.11
        ducks.append({
            "track_id": tid,
            "behavior": behavior,
            "x": base_x,
            "y": base_y,
            "w": w,
            "h": h,
        })

    abnormal_count = sum(1 for d in ducks if d["behavior"] != "NORMAL")

    behavior_summary = {
        "NORMAL": num_ducks - abnormal_count,
        "SUPINE_FLIPPED": sum(1 for d in ducks if d["behavior"] == "SUPINE_FLIPPED"),
        "ISOLATED_LOW_MOBILITY": sum(1 for d in ducks if d["behavior"] == "ISOLATED_LOW_MOBILITY"),
        "LETHARGIC": sum(1 for d in ducks if d["behavior"] == "LETHARGIC"),
        "ISOLATED": sum(1 for d in ducks if d["behavior"] == "ISOLATED"),
    }

    for f_idx in range(total_frames):
        ts = round(f_idx / fps, 2)
        for d in ducks:
            if d["behavior"] == "NORMAL":
                d["x"] += math.sin(f_idx * 0.3 + d["track_id"]) * 0.004
                d["y"] += math.cos(f_idx * 0.3 + d["track_id"]) * 0.003
            elif d["behavior"] == "SUPINE_FLIPPED":
                # Lật ngửa: giãy tại chỗ ở vị trí cố định
                d["x"] += random.uniform(-0.0002, 0.0002)
                d["y"] += random.uniform(-0.0002, 0.0002)
            elif d["behavior"] == "ISOLATED_LOW_MOBILITY":
                # Tách đàn đứng góc xa và bất động
                d["x"] = 0.82 + math.sin(f_idx * 0.05) * 0.0003
                d["y"] = 0.78 + math.cos(f_idx * 0.05) * 0.0003
            elif d["behavior"] == "LETHARGIC":
                d["x"] += random.uniform(-0.0005, 0.0005)
                d["y"] += random.uniform(-0.0005, 0.0005)
            elif d["behavior"] == "ISOLATED":
                d["x"] += math.sin(f_idx * 0.1) * 0.002
                d["y"] += math.cos(f_idx * 0.1) * 0.002

            cx = max(0.05, min(0.85, d["x"]))
            cy = max(0.05, min(0.80, d["y"]))
            conf = round(random.uniform(0.88, 0.98), 2)

            tracks.append({
                "frame_index": f_idx,
                "timestamp_sec": ts,
                "track_id": d["track_id"],
                "behavior_label": d["behavior"],
                "confidence": conf,
                "bbox": [round(cx, 4), round(cy, 4), d["w"], d["h"]]
            })

    return tracks, behavior_summary, num_ducks, abnormal_count

@router.post("/analyze", response_model=AIAnalyzeResponse)
async def analyze_video(
    flock_id: int = Form(...),
    barn_id: int = Form(...),
    video_file: Optional[UploadFile] = File(None),
    sample_video: Optional[str] = Form("sample_duck_flock_01.mp4"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    flock = await db.get(Flock, flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Đàn vịt không tồn tại")
    barn = await db.get(Barn, barn_id)
    if not barn:
        raise HTTPException(status_code=404, detail="Chuồng nuôi không tồn tại")

    if video_file:
        ext = os.path.splitext(video_file.filename)[1].lower()
        if ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            raise HTTPException(
                status_code=400,
                detail="Mô hình AI nhận diện và đánh giá chuỗi hành vi qua thời gian (Tách đàn, giảm vận động, lật ngửa) nên bắt buộc sử dụng tệp Video (.mp4, .avi, .mov), không nhận diện qua ảnh tĩnh đơn lẻ."
            )

    filename = video_file.filename if video_file else (sample_video or "sample_duck_flock_01.mp4")
    
    raw_tracks = []
    summary = {}
    total_detected = 12
    abnormal_cnt = 0
    alerts_generated = []
    duration_seconds = 15.0

    if video_file:
        if not HAS_PIPELINE or analyze_video_full_pipeline is None:
            raise HTTPException(
                status_code=503,
                detail="Mô hình AI nhận diện (YOLO & BoT-SORT) chưa thể chạy trên máy chủ đám mây do giới hạn tài nguyên GPU/RAM (Render Free 512MB). Vui lòng chạy backend cục bộ (local) để phân tích tệp video thực tế."
            )
        try:
            temp_dir = "uploads"
            os.makedirs(temp_dir, exist_ok=True)
            temp_media_path = os.path.join(temp_dir, filename)
            with open(temp_media_path, "wb") as buffer:
                shutil.copyfileobj(video_file.file, buffer)

            # Chạy pipeline phân tích Video tích hợp toàn bộ thời lượng
            res = analyze_video_full_pipeline(video_path=temp_media_path, conf=0.30, max_frames=None)
            raw_tracks = res.get("tracks", [])
            summary = res.get("behavior_summary", {})
            total_detected = res.get("total_ducks_detected", 0)
            abnormal_cnt = res.get("abnormal_count", 0)
            alerts_generated = res.get("alerts_generated", [])
            duration_seconds = res.get("duration_sec", 15.0)
        except Exception as e:
            print(f"Lỗi khi chạy model thực tế trên video: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Lỗi khi phân tích video qua mô hình AI: {str(e)}"
            )
    else:
        # CHỈ mô phỏng khi người dùng xem video mẫu có sẵn trong hệ thống (sample_video)
        raw_tracks, summary, total_detected, abnormal_cnt = generate_duck_behavior_simulation(flock_id, barn_id, filename)
        if summary.get("SUPINE_FLIPPED", 0) > 0:
            alerts_generated.append(
                f"[AI HÀNH VI] Phát hiện {summary['SUPINE_FLIPPED']} cá thể vịt LẬT NGỬA / CO GIẬT CHÂN tại Chuồng {barn.name} (Đàn {flock.code}). Cảnh báo hành vi bất thường, khuyến nghị kiểm tra!"
            )
        if summary.get("ISOLATED_LOW_MOBILITY", 0) > 0:
            alerts_generated.append(
                f"[AI HÀNH VI] Phát hiện {summary['ISOLATED_LOW_MOBILITY']} cá thể TÁCH ĐÀN & GIẢM VẬN ĐỘNG KÉO DÀI (>=40s) tại Chuồng {barn.name} (Đàn {flock.code}). Cảnh báo hành vi bất thường!"
            )

    session = AIAnalysisSession(
        flock_id=flock_id,
        barn_id=barn_id,
        session_date=datetime.utcnow(),
        video_filename=filename,
        duration_seconds=round(duration_seconds, 1),
        total_ducks_detected=total_detected,
        abnormal_count=abnormal_cnt,
        status="COMPLETED"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    det_models = []
    for t in raw_tracks:
        det_models.append(AIDetectionResult(
            session_id=session.id,
            frame_index=t["frame_index"],
            timestamp_sec=t["timestamp_sec"],
            track_id=t["track_id"],
            behavior_label=t["behavior_label"],
            confidence=t["confidence"],
            bbox_x=t["bbox"][0],
            bbox_y=t["bbox"][1],
            bbox_w=t["bbox"][2],
            bbox_h=t["bbox"][3]
        ))
    db.add_all(det_models)

    if alerts_generated:
        for msg in alerts_generated:
            alert = AIAlert(
                session_id=session.id,
                flock_id=flock_id,
                alert_type="BEHAVIOR_ANOMALY_DETECTED",
                severity=AIAlertSeverity.CRITICAL if ("LẬT NGỬA" in msg) else AIAlertSeverity.WARNING,
                message=msg,
                status=AIAlertStatus.NEW
            )
            db.add(alert)
            notif = Notification(
                user_id=current_user.id if current_user else 0,
                title="CẢNH BÁO AI GIÁM SÁT HÀNH VI",
                message=msg,
                is_read=False
            )
            db.add(notif)
    elif abnormal_cnt > 0:
        alert_msg = f"Phát hiện {abnormal_cnt} cá thể vịt có hành vi bất thường tại Chuồng {barn.name} (Đàn {flock.code})."
        alert = AIAlert(
            session_id=session.id,
            flock_id=flock_id,
            alert_type="BEHAVIOR_ANOMALY_DETECTED",
            severity=AIAlertSeverity.WARNING,
            message=alert_msg,
            status=AIAlertStatus.NEW
        )
        db.add(alert)

    await db.commit()

    tracks_out = [
        AIDetectionTrack(
            frame_index=t["frame_index"],
            timestamp_sec=t["timestamp_sec"],
            track_id=t["track_id"],
            behavior_label=t["behavior_label"],
            confidence=t["confidence"],
            bbox=t["bbox"]
        ) for t in raw_tracks
    ]

    return AIAnalyzeResponse(
        session_id=session.id,
        flock_id=flock_id,
        barn_id=barn_id,
        video_filename=filename,
        duration_seconds=round(duration_seconds, 1),
        total_ducks_detected=total_detected,
        abnormal_count=abnormal_cnt,
        behavior_summary=summary,
        tracks=tracks_out,
        alerts_generated=alerts_generated
    )

# ---- AI SESSIONS ENDPOINTS ----

@router.get("/sessions", response_model=List[AIAnalysisSessionOut])
async def list_ai_sessions(
    flock_id: Optional[int] = None,
    barn_id: Optional[int] = None,
    updated_since: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(AIAnalysisSession).options(
        selectinload(AIAnalysisSession.flock).selectinload(Flock.barn),
        selectinload(AIAnalysisSession.barn)
    )
    if flock_id:
        query = query.where(AIAnalysisSession.flock_id == flock_id)
    if barn_id:
        query = query.where(AIAnalysisSession.barn_id == barn_id)
    if updated_since:
        query = query.where(or_(AIAnalysisSession.updated_at >= updated_since, AIAnalysisSession.created_at >= updated_since))
    
    query = query.order_by(AIAnalysisSession.session_date.desc()).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/sessions", response_model=AIAnalysisSessionOut, status_code=status.HTTP_201_CREATED)
async def create_ai_session(
    session_in: AIAnalysisSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    flock = await db.get(Flock, session_in.flock_id)
    if not flock:
        raise HTTPException(status_code=404, detail="Đàn vịt không tồn tại")
    barn = await db.get(Barn, session_in.barn_id)
    if not barn:
        raise HTTPException(status_code=404, detail="Chuồng nuôi không tồn tại")

    session = AIAnalysisSession(**session_in.model_dump())
    db.add(session)
    await db.commit()

    res = await db.execute(
        select(AIAnalysisSession)
        .options(
            selectinload(AIAnalysisSession.flock).selectinload(Flock.barn),
            selectinload(AIAnalysisSession.barn)
        )
        .where(AIAnalysisSession.id == session.id)
    )
    return res.scalars().first()

@router.get("/sessions/{session_id}", response_model=AIAnalysisSessionOut)
async def get_ai_session(session_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    res = await db.execute(
        select(AIAnalysisSession)
        .options(
            selectinload(AIAnalysisSession.flock).selectinload(Flock.barn),
            selectinload(AIAnalysisSession.barn)
        )
        .where(AIAnalysisSession.id == session_id)
    )
    session = res.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên phân tích AI")
    return session

@router.get("/sessions/{session_id}/detections", response_model=List[AIDetectionResultOut])
async def list_session_detections(session_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    session = await db.get(AIAnalysisSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Phiên phân tích AI không tồn tại")
    
    query = select(AIDetectionResult).where(AIDetectionResult.session_id == session_id).order_by(AIDetectionResult.frame_index.asc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/sessions/{session_id}/detections", response_model=List[AIDetectionResultOut], status_code=status.HTTP_201_CREATED)
async def create_session_detections(
    session_id: int,
    detections: List[AIDetectionResultCreate],
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session = await db.get(AIAnalysisSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Phiên phân tích AI không tồn tại")

    created = []
    for d in detections:
        det_data = d.model_dump()
        det_data["session_id"] = session_id
        det = AIDetectionResult(**det_data)
        db.add(det)
        created.append(det)

    await db.commit()
    for item in created:
        await db.refresh(item)
    return created

# ---- ALL AI DETECTIONS ENDPOINT ----

@router.get("/detections", response_model=List[AIDetectionResultOut])
async def list_all_detections(
    session_id: Optional[int] = None,
    updated_since: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(AIDetectionResult)
    if session_id:
        query = query.where(AIDetectionResult.session_id == session_id)
    if updated_since:
        query = query.where(or_(AIDetectionResult.updated_at >= updated_since, AIDetectionResult.created_at >= updated_since))
    
    query = query.order_by(AIDetectionResult.id.desc()).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()

# ---- AI ALERTS ENDPOINTS ----

@router.get("/alerts", response_model=List[AIAlertOut])
async def list_ai_alerts(
    status: Optional[str] = None,
    updated_since: Optional[datetime] = Query(None),
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(AIAlert).options(selectinload(AIAlert.flock).selectinload(Flock.barn))
    if status:
        query = query.where(AIAlert.status == status)
    if updated_since:
        query = query.where(or_(AIAlert.updated_at >= updated_since, AIAlert.created_at >= updated_since))
    query = query.order_by(AIAlert.timestamp.desc()).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()

@router.put("/alerts/{alert_id}/status", response_model=AIAlertOut)
async def update_alert_status(
    alert_id: int,
    status_str: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    alert = await db.get(AIAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy cảnh báo")
    
    if status_str in ["NEW", "ACKNOWLEDGED", "RESOLVED"]:
        alert.status = AIAlertStatus(status_str)
        await db.commit()
    
    res = await db.execute(select(AIAlert).options(selectinload(AIAlert.flock).selectinload(Flock.barn)).where(AIAlert.id == alert_id))
    return res.scalars().first()
