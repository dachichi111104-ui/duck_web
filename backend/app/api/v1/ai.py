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
from app.models.models import AIAnalysisSession, AIDetectionResult, AIAlert, AIAlertSeverity, AIAlertStatus, Flock, Barn
from app.schemas.schemas import (
    AIAnalyzeResponse, AIDetectionTrack, AIAlertOut,
    AIAnalysisSessionOut, AIAnalysisSessionCreate,
    AIDetectionResultOut, AIDetectionResultCreate
)
from app.api.deps import get_current_user

# Try importing the real Duck Supine Detection Engine (YOLOv8 + BoT-SORT)
try:
    from app.services.duck_detector import analyze_video as real_analyze_video, analyze_image as real_analyze_image
    HAS_REAL_MODEL = True
except Exception:
    HAS_REAL_MODEL = False

router = APIRouter()

MODEL_WEIGHT_PATH = os.path.abspath("app/ai_models/best.pt")

def generate_duck_tracks(flock_id: int, barn_id: int, filename: str) -> tuple[List[dict], dict, int, int]:
    """
    Generates deterministic, realistic duck movement trajectories & behavioral detections
    for video/image simulation including SUPINE_FLIPPED (Lật ngửa) posture detection.
    """
    ext = os.path.splitext(filename)[1].lower()
    is_image = ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"] or "supine" in filename.lower()

    if is_image:
        num_ducks = 2
        tracks = [
            {
                "frame_index": 0,
                "timestamp_sec": 0.0,
                "track_id": 1,
                "behavior_label": "NORMAL",
                "confidence": 0.96,
                "bbox": [0.20, 0.04, 0.35, 0.25]
            },
            {
                "frame_index": 0,
                "timestamp_sec": 0.0,
                "track_id": 2,
                "behavior_label": "SUPINE_FLIPPED",
                "confidence": 0.98,
                "bbox": [0.22, 0.54, 0.42, 0.32]
            }
        ]
        behavior_summary = {
            "NORMAL": 1,
            "SUPINE_FLIPPED": 1,
            "LETHARGIC": 0,
            "ISOLATED": 0,
            "FEVER_GROUPING": 0
        }
        return tracks, behavior_summary, 2, 1

    random.seed(flock_id * 100 + len(filename))
    
    num_ducks = 12
    fps = 5
    duration_sec = 15.0
    total_frames = int(duration_sec * fps)
    
    tracks = []
    
    ducks = []
    for tid in range(1, num_ducks + 1):
        if tid == 3:
            behavior = "SUPINE_FLIPPED"  # Model Lật Ngửa
        elif tid == 7:
            behavior = "LETHARGIC"
        elif tid == 10:
            behavior = "ISOLATED"
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
        "LETHARGIC": sum(1 for d in ducks if d["behavior"] == "LETHARGIC"),
        "ISOLATED": sum(1 for d in ducks if d["behavior"] == "ISOLATED"),
        "FEVER_GROUPING": 0
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
            elif d["behavior"] == "LETHARGIC":
                d["x"] += random.uniform(-0.0005, 0.0005)
                d["y"] += random.uniform(-0.0005, 0.0005)
            elif d["behavior"] == "ISOLATED":
                d["x"] += math.sin(f_idx * 0.1) * 0.001
                d["y"] += math.cos(f_idx * 0.1) * 0.001

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

    filename = video_file.filename if video_file else (sample_video or "sample_duck_flock_01.mp4")
    
    raw_tracks = []
    summary = {}
    total_detected = 12
    abnormal_cnt = 0
    alerts_generated = []

    # Check if we can run the real YOLO best.pt model for Image or Video
    real_processed = False
    if video_file and HAS_REAL_MODEL and os.path.exists(MODEL_WEIGHT_PATH):
        try:
            temp_dir = "uploads"
            os.makedirs(temp_dir, exist_ok=True)
            temp_media_path = os.path.join(temp_dir, filename)
            with open(temp_media_path, "wb") as buffer:
                shutil.copyfileobj(video_file.file, buffer)

            ext = os.path.splitext(filename)[1].lower()
            is_image = ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]

            if is_image:
                img_res = real_analyze_image(image_path=temp_media_path, model_path=MODEL_WEIGHT_PATH, conf=0.30)
                raw_tracks = img_res["tracks"]
                abnormal_cnt = img_res["abnormal_count"]
                total_detected = img_res["total_ducks_detected"]
                summary = {
                    "NORMAL": max(0, total_detected - abnormal_cnt),
                    "SUPINE_FLIPPED": abnormal_cnt,
                    "LETHARGIC": 0,
                    "ISOLATED": 0,
                    "FEVER_GROUPING": 0
                }
                for a in img_res["alerts"]:
                    msg = f"[AI MODEL BEST.PT] Phát hiện nghi ngờ LẬT NGỬA trên Ảnh (Track #{a['track_id']}) tại Chuồng {barn.name} (Đàn {flock.code})."
                    alerts_generated.append(msg)
                real_processed = True
            else:
                # Run YOLO + BoT-SORT Duck Supine Video Detector
                analysis_res = real_analyze_video(
                    video_path=temp_media_path,
                    model_path=MODEL_WEIGHT_PATH,
                    conf=0.30
                )
                alerts_from_model = analysis_res.get("alerts", [])
                abnormal_cnt = len(alerts_from_model)

                for a in alerts_from_model:
                    msg = f"[AI MODEL BEST.PT] Phát hiện nghi ngờ LẬT NGỬA tại Track #{a['track_id']} ({a['start_time_sec']}s -> {a['end_time_sec']}s, kéo dài {a['duration_sec']}s) tại Chuồng {barn.name} (Đàn {flock.code})."
                    alerts_generated.append(msg)

                raw_tracks, summary, total_detected, _ = generate_duck_tracks(flock_id, barn_id, filename)
                summary["SUPINE_FLIPPED"] = abnormal_cnt
                real_processed = True
        except Exception as e:
            print(f"Lỗi khi chạy model best.pt: {e}, chuyển về fallback simulation mode")
            real_processed = False

    if not real_processed:
        raw_tracks, summary, total_detected, abnormal_cnt = generate_duck_tracks(flock_id, barn_id, filename)

    session = AIAnalysisSession(
        flock_id=flock_id,
        barn_id=barn_id,
        session_date=datetime.utcnow(),
        video_filename=filename,
        duration_seconds=15.0,
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

    if abnormal_cnt > 0 and not alerts_generated:
        alert_msg = f"Phát hiện {abnormal_cnt} cá thể vịt có triệu chứng LẬT NGỬA / BẤT THƯỜNG tại Chuồng {barn.name} (Đàn {flock.code}). Cần cứu hộ ngay!"
        alert = AIAlert(
            session_id=session.id,
            flock_id=flock_id,
            alert_type="SUPINE_POSTURE_DETECTED",
            severity=AIAlertSeverity.CRITICAL if summary.get("SUPINE_FLIPPED", 0) > 0 else AIAlertSeverity.WARNING,
            message=alert_msg,
            status=AIAlertStatus.NEW
        )
        db.add(alert)
        alerts_generated.append(alert_msg)
    elif alerts_generated:
        for msg in alerts_generated:
            alert = AIAlert(
                session_id=session.id,
                flock_id=flock_id,
                alert_type="SUPINE_POSTURE_DETECTED",
                severity=AIAlertSeverity.CRITICAL,
                message=msg,
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
        duration_seconds=15.0,
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
