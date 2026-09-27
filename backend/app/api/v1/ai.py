import random
import math
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import AIAnalysisSession, AIDetectionResult, AIAlert, AIAlertSeverity, AIAlertStatus, Flock, Barn
from app.schemas.schemas import AIAnalyzeResponse, AIDetectionTrack, AIAlertOut
from app.api.deps import get_current_user

router = APIRouter()

def generate_duck_tracks(flock_id: int, barn_id: int, filename: str) -> tuple[List[dict], dict, int, int]:
    """
    Generates deterministic, realistic duck movement trajectories & behavioral detections
    for video simulation.
    Track behaviors:
      - NORMAL (Bình thường - Xanh lá): vịt di chuyển linh hoạt
      - LETHARGIC (Ủ rũ/Ít vận động - Vàng): vịt nằm nghiêng, ít xê dịch
      - ISOLATED (Tách đàn/Nghi bệnh - Đỏ): vịt đứng góc xa đàn
      - FEVER_GROUPING (Cụm sốt - Cam): nhóm vịt tụ lại
    """
    random.seed(flock_id * 100 + len(filename))
    
    # Number of simulated ducks in video stream
    num_ducks = 12
    fps = 5
    duration_sec = 15.0
    total_frames = int(duration_sec * fps)
    
    tracks = []
    
    # Initialize base positions for each duck track
    ducks = []
    for tid in range(1, num_ducks + 1):
        # 1 or 2 ducks set as abnormal
        if tid == 3:
            behavior = "LETHARGIC"
        elif tid == 7:
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
            "dx": random.uniform(-0.005, 0.005),
            "dy": random.uniform(-0.005, 0.005)
        })

    abnormal_count = sum(1 for d in ducks if d["behavior"] != "NORMAL")

    behavior_summary = {
        "NORMAL": num_ducks - abnormal_count,
        "LETHARGIC": sum(1 for d in ducks if d["behavior"] == "LETHARGIC"),
        "ISOLATED": sum(1 for d in ducks if d["behavior"] == "ISOLATED"),
        "FEVER_GROUPING": 0
    }

    for f_idx in range(total_frames):
        ts = round(f_idx / fps, 2)
        for d in ducks:
            # Update smooth motion simulation
            if d["behavior"] == "NORMAL":
                d["x"] += math.sin(f_idx * 0.3 + d["track_id"]) * 0.004
                d["y"] += math.cos(f_idx * 0.3 + d["track_id"]) * 0.003
            elif d["behavior"] == "LETHARGIC":
                d["x"] += random.uniform(-0.0005, 0.0005)
                d["y"] += random.uniform(-0.0005, 0.0005)
            elif d["behavior"] == "ISOLATED":
                d["x"] += math.sin(f_idx * 0.1) * 0.001
                d["y"] += math.cos(f_idx * 0.1) * 0.001

            # Clamp bbox inside [0.05, 0.85]
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

    filename = video_file.filename if video_file else (sample_video or "sample_duck_flock_01.mp4")

    # Run simulated tracking AI pipeline
    raw_tracks, summary, total_detected, abnormal_cnt = generate_duck_tracks(flock_id, barn_id, filename)

    # Save session
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

    # Save detection results
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

    # Generate alert if abnormal ducks detected
    alerts_generated = []
    if abnormal_cnt > 0:
        alert_msg = f"Phát hiện {abnormal_cnt} cá thể vịt có hành vi bất thường (ủ rũ / đứng tách đàn) tại Chuồng {barn.name} (Đàn {flock.code})."
        alert = AIAlert(
            session_id=session.id,
            flock_id=flock_id,
            alert_type="LETHARGY_DETECTED",
            severity=AIAlertSeverity.WARNING if abnormal_cnt == 1 else AIAlertSeverity.HIGH,
            message=alert_msg,
            status=AIAlertStatus.NEW
        )
        db.add(alert)
        alerts_generated.append(alert_msg)

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

@router.get("/alerts", response_model=List[AIAlertOut])
async def list_ai_alerts(
    status: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(AIAlert).options(selectinload(AIAlert.flock))
    if status:
        query = query.where(AIAlert.status == status)
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
    
    res = await db.execute(select(AIAlert).options(selectinload(AIAlert.flock)).where(AIAlert.id == alert_id))
    return res.scalars().first()
