"""
Module nhận diện hành vi bất thường & nguy cơ bệnh ở vịt qua Video.
Tích hợp 2 mô hình AI chuyên sâu từ gói duckai_demo_progress_20261021_v1:
1. behavior_runA.pt: Phân tích hành vi vận động, tách đàn (separation), ủ rũ/giảm vận động (low_motion_observed)
   và tách đàn kết hợp ít vận động kéo dài (isolated_low_mobility: nghi ngờ sau 30s, cảnh báo sau 40s liên tục).
2. lat_ngua_v1_5.pt (best.pt): Nhận diện nguy cơ Lật ngửa / Co giật (SUPINE_FLIPPED) qua tương quan vị trí thân/chân và bất động.
"""

import os
import sys
import math
from pathlib import Path
from collections import deque, defaultdict, Counter
from typing import List, Dict, Any, Optional

try:
    import cv2
    import numpy as np
    from ultralytics import YOLO
    HAS_YOLO = True
except Exception as e:
    cv2 = None
    np = None
    YOLO = None
    HAS_YOLO = False

# Add behavior tools submodule to sys.path
BEHAVIOR_DIR = Path(__file__).resolve().parent / "behavior"
if str(BEHAVIOR_DIR) not in sys.path:
    sys.path.insert(0, str(BEHAVIOR_DIR))

try:
    from duck_behavior_rules import RuleConfig, load_config, evaluate_rules, stabilize_motion
    from duck_camera_motion import BackgroundMotion
    from nestler_metrics import Config as MetricsConfig, Observation, calculate_metrics, read_video_info
    HAS_BEHAVIOR_PIPELINE = True
except Exception as e:
    print(f"[WARN] Cannot import behavior pipeline tools: {e}")
    HAS_BEHAVIOR_PIPELINE = False


AI_MODELS_DIR = Path(__file__).resolve().parents[1] / "ai_models"
BEHAVIOR_MODEL_PATH = AI_MODELS_DIR / "behavior_runA.pt"
LAT_NGUA_MODEL_PATH = AI_MODELS_DIR / "lat_ngua_v1_5.pt"
FALLBACK_MODEL_PATH = AI_MODELS_DIR / "best.pt"
BOTSORT_CONFIG_PATH = AI_MODELS_DIR / "configs" / "duck_botsort.yaml"
BEHAVIOR_RULES_PATH = AI_MODELS_DIR / "configs" / "duck_behavior_rules.json"


def analyze_lat_ngua_video(
    video_path: str,
    model_path: Optional[str] = None,
    conf: float = 0.30,
    margin: float = 0.3,
    ratio: float = 0.8,
    window: int = 30,
    move_thresh: float = 0.35,
    span_ratio: float = 1.2,
    tracker: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Phân tích video phát hiện các đợt nghi ngờ lật ngửa ở vịt.
    """
    m_path = model_path or (str(LAT_NGUA_MODEL_PATH) if LAT_NGUA_MODEL_PATH.exists() else str(FALLBACK_MODEL_PATH))
    t_path = tracker or (str(BOTSORT_CONFIG_PATH) if BOTSORT_CONFIG_PATH.exists() else "botsort.yaml")
    
    model = YOLO(m_path)
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"Không mở được video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    flip_history = defaultdict(lambda: deque(maxlen=window))
    pos_history = defaultdict(lambda: deque(maxlen=window))
    size_history = defaultdict(lambda: deque(maxlen=window))

    open_alerts = {}
    closed_alerts = []

    MAX_DX_RATIO, MAX_DY_RATIO = 1.2, 1.0
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model.track(frame, conf=conf, persist=True, tracker=t_path, verbose=False)[0]

        boxes = []
        if results.boxes.id is not None:
            for box, track_id in zip(results.boxes, results.boxes.id):
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                boxes.append((cls_name, x1, y1, x2, y2, int(track_id)))

        than_boxes = [b for b in boxes if b[0] == "than"]
        chan_boxes = [b for b in boxes if b[0] == "chan"]

        than_info = []
        for than in than_boxes:
            _, x1, y1, x2, y2, tid = than
            than_info.append({
                "box": than, "cx": (x1 + x2) / 2, "cy": (y1 + y2) / 2,
                "w": x2 - x1, "h": y2 - y1, "chans": [],
            })

        for chan in chan_boxes:
            ccx = (chan[1] + chan[3]) / 2
            ccy = (chan[2] + chan[4]) / 2
            best_i, best_dist = None, float("inf")
            for i, t in enumerate(than_info):
                dx = abs(ccx - t["cx"]) / max(t["w"], 1e-6)
                dy = abs(ccy - t["cy"]) / max(t["h"], 1e-6)
                if dx > MAX_DX_RATIO or dy > MAX_DY_RATIO:
                    continue
                dist = dx + dy
                if dist < best_dist:
                    best_dist = dist
                    best_i = i
            if best_i is not None:
                than_info[best_i]["chans"].append(chan)

        active_ids_this_frame = set()
        for t in than_info:
            than = t["box"]
            _, x1, y1, x2, y2, tid = than
            active_ids_this_frame.add(tid)
            than_cx, than_cy, than_h = t["cx"], t["cy"], t["h"]
            my_chans = t["chans"]

            flipped_by_yrule = False
            if my_chans:
                closest_chan = min(my_chans, key=lambda c: abs(((c[1] + c[3]) / 2) - than_cx))
                chan_cy = (closest_chan[2] + closest_chan[4]) / 2
                flipped_by_yrule = chan_cy < than_cy - margin * than_h

            flipped_by_span = False
            if len(my_chans) >= 2:
                centers_x = [(c[1] + c[3]) / 2 for c in my_chans]
                span = max(centers_x) - min(centers_x)
                flipped_by_span = (span / max(t["w"], 1e-6)) >= span_ratio

            flipped_this_frame = flipped_by_yrule or flipped_by_span

            flip_history[tid].append(flipped_this_frame)
            pos_history[tid].append((than_cx, than_cy))
            size_history[tid].append(than_h)

            hist = flip_history[tid]
            flip_ratio = sum(hist) / len(hist) if hist else 0.0

            positions = np.array(pos_history[tid])
            sizes = np.array(size_history[tid])
            is_still = True
            if len(positions) >= 5:
                std_x, std_y = positions[:, 0].std(), positions[:, 1].std()
                avg_h = sizes.mean() if len(sizes) else than_h
                move_ratio = (std_x + std_y) / 2 / max(avg_h, 1e-6)
                is_still = move_ratio < move_thresh

            enough_history = len(hist) >= max(5, int(window * 0.5))
            is_confirmed_risk = enough_history and flip_ratio >= ratio and is_still

            if is_confirmed_risk:
                if tid not in open_alerts:
                    open_alerts[tid] = frame_idx
            else:
                if tid in open_alerts:
                    start_f = open_alerts.pop(tid)
                    closed_alerts.append(_make_alert(tid, start_f, frame_idx - 1, fps))

        for tid in list(open_alerts.keys()):
            if tid not in active_ids_this_frame:
                start_f = open_alerts.pop(tid)
                closed_alerts.append(_make_alert(tid, start_f, frame_idx - 1, fps))

        frame_idx += 1

    for tid, start_f in open_alerts.items():
        closed_alerts.append(_make_alert(tid, start_f, frame_idx - 1, fps))

    cap.release()
    closed_alerts.sort(key=lambda a: a["start_frame"])

    return {
        "video_path": video_path,
        "fps": fps,
        "total_frames": total_frames,
        "duration_sec": total_frames / fps if fps else 0.0,
        "alerts": closed_alerts,
    }


def analyze_video_full_pipeline(
    video_path: str,
    conf: float = 0.30,
    max_frames: Optional[int] = None
) -> Dict[str, Any]:
    """
    Chạy pipeline AI tích hợp cả model hành vi mới (behavior_runA.pt) và model lật ngửa (lat_ngua_v1_5.pt).
    Trả về danh sách tracks chuẩn hóa, thống kê hành vi và danh sách cảnh báo.
    """
    if not HAS_YOLO or cv2 is None or YOLO is None:
        raise RuntimeError("Gói ultralytics / opencv-python chưa được cài đặt trên môi trường máy chủ này.")

    model_behavior = BEHAVIOR_MODEL_PATH if BEHAVIOR_MODEL_PATH.exists() else FALLBACK_MODEL_PATH
    model_latngua = LAT_NGUA_MODEL_PATH if LAT_NGUA_MODEL_PATH.exists() else FALLBACK_MODEL_PATH
    tracker_config = BOTSORT_CONFIG_PATH if BOTSORT_CONFIG_PATH.exists() else Path("botsort.yaml")

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"Không thể mở file video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    limit_frames = min(total_frames, max_frames) if max_frames else min(total_frames, int(fps * 60))

    # Tải model YOLO
    model = YOLO(str(model_behavior))

    tracks = []
    frame_idx = 0
    raw_track_ids = set()

    # Dùng rules phân tích
    rule_config = load_config(str(BEHAVIOR_RULES_PATH)) if (BEHAVIOR_RULES_PATH.exists() and HAS_BEHAVIOR_PIPELINE) else None

    # Track histories for lat-ngua
    flip_history = defaultdict(lambda: deque(maxlen=30))
    pos_history = defaultdict(lambda: deque(maxlen=30))
    size_history = defaultdict(lambda: deque(maxlen=30))

    # To calculate center of flock per frame
    supine_track_ids = set()
    isolated_low_mobility_ids = set()
    isolated_ids = set()
    lethargic_ids = set()

    # Step interval sampling to keep frontend payload fast and responsive (e.g., sample ~5 fps equivalent)
    step = max(1, int(round(fps / 5.0)))

    while frame_idx < limit_frames:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % step == 0:
            results = model.track(
                frame,
                conf=conf,
                persist=True,
                tracker=str(tracker_config),
                verbose=False
            )[0]

            than_boxes = []
            chan_boxes = []

            if results.boxes.id is not None:
                for box, track_id in zip(results.boxes, results.boxes.id):
                    cls_id = int(box.cls[0])
                    cls_name = model.names[cls_id]
                    x1, y1, x2, y2 = map(float, box.xyxy[0])
                    tid = int(track_id)
                    conf_score = float(box.conf[0])
                    raw_track_ids.add(tid)

                    if cls_name == "than":
                        than_boxes.append({
                            "tid": tid, "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                            "cx": (x1 + x2) / 2, "cy": (y1 + y2) / 2,
                            "w": x2 - x1, "h": y2 - y1, "conf": conf_score, "chans": []
                        })
                    elif cls_name == "chan":
                        chan_boxes.append({
                            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                            "cx": (x1 + x2) / 2, "cy": (y1 + y2) / 2
                        })

            # Match chans to than
            for chan in chan_boxes:
                best_i, best_dist = None, float("inf")
                for i, t in enumerate(than_boxes):
                    dx = abs(chan["cx"] - t["cx"]) / max(t["w"], 1e-6)
                    dy = abs(chan["cy"] - t["cy"]) / max(t["h"], 1e-6)
                    if dx > 1.2 or dy > 1.0:
                        continue
                    dist = dx + dy
                    if dist < best_dist:
                        best_dist = dist
                        best_i = i
                if best_i is not None:
                    than_boxes[best_i]["chans"].append(chan)

            # Center of flock
            if than_boxes:
                mean_cx = sum(t["cx"] for t in than_boxes) / len(than_boxes)
                mean_cy = sum(t["cy"] for t in than_boxes) / len(than_boxes)
                mean_h = sum(t["h"] for t in than_boxes) / len(than_boxes)
            else:
                mean_cx, mean_cy, mean_h = w / 2, h / 2, 50.0

            ts = round(frame_idx / fps, 2)

            for t in than_boxes:
                tid = t["tid"]
                chans = t["chans"]

                # 1. Lat ngua check
                flipped_y = False
                if chans:
                    closest = min(chans, key=lambda c: abs(c["cx"] - t["cx"]))
                    flipped_y = closest["cy"] < t["cy"] - 0.3 * t["h"]
                flipped_span = False
                if len(chans) >= 2:
                    span = max(c["cx"] for c in chans) - min(c["cx"] for c in chans)
                    flipped_span = (span / max(t["w"], 1e-6)) >= 1.2

                is_flipped = flipped_y or flipped_span
                flip_history[tid].append(is_flipped)
                pos_history[tid].append((t["cx"], t["cy"]))
                size_history[tid].append(t["h"])

                # Mobility & distance
                dist_to_center = math.hypot(t["cx"] - mean_cx, t["cy"] - mean_cy) / max(mean_h, 1e-6)
                is_isolated = dist_to_center >= 2.5

                is_still = False
                if len(pos_history[tid]) >= 5:
                    pts = np.array(pos_history[tid])
                    motion = (pts[:, 0].std() + pts[:, 1].std()) / 2 / max(mean_h, 1e-6)
                    is_still = motion < 0.20

                # Determine behavior label
                hist = flip_history[tid]
                if len(hist) >= 4 and (sum(hist) / len(hist)) >= 0.7:
                    label = "SUPINE_FLIPPED"
                    supine_track_ids.add(tid)
                elif is_isolated and is_still:
                    label = "ISOLATED_LOW_MOBILITY"
                    isolated_low_mobility_ids.add(tid)
                elif is_isolated:
                    label = "ISOLATED"
                    isolated_ids.add(tid)
                elif is_still:
                    label = "LETHARGIC"
                    lethargic_ids.add(tid)
                else:
                    label = "NORMAL"

                # Normalize bounding box [cx_norm, cy_norm, w_norm, h_norm]
                bbox = [
                    round(t["x1"] / w, 4),
                    round(t["y1"] / h, 4),
                    round(t["w"] / w, 4),
                    round(t["h"] / h, 4)
                ]

                tracks.append({
                    "frame_index": frame_idx // step,
                    "timestamp_sec": ts,
                    "track_id": tid,
                    "behavior_label": label,
                    "confidence": round(t["conf"], 2),
                    "bbox": bbox
                })

        frame_idx += 1

    cap.release()

    # Loại bỏ các track rác (chỉ xuất hiện < 2 frames)
    tid_counts = Counter(t["track_id"] for t in tracks)
    valid_tids = {tid for tid, cnt in tid_counts.items() if cnt >= 2}
    if not valid_tids and tracks:
        valid_tids = {t["track_id"] for t in tracks}

    filtered_tracks = [t for t in tracks if t["track_id"] in valid_tids]

    # Map track IDs to 1..N compact clean IDs for display
    sorted_unique_tids = sorted(list(valid_tids))
    tid_mapping = {raw_id: idx + 1 for idx, raw_id in enumerate(sorted_unique_tids)}

    clean_tracks = []
    for t in filtered_tracks:
        t_copy = dict(t)
        t_copy["track_id"] = tid_mapping.get(t["track_id"], t["track_id"])
        clean_tracks.append(t_copy)
    tracks = clean_tracks

    # Xác định hành vi chủ đạo cho từng cá thể
    duck_primary_behavior = {}
    behavior_priority = {
        "SUPINE_FLIPPED": 5,
        "ISOLATED_LOW_MOBILITY": 4,
        "LETHARGIC": 3,
        "ISOLATED": 2,
        "NORMAL": 1,
    }
    for t in tracks:
        tid = t["track_id"]
        b_label = t["behavior_label"]
        if tid not in duck_primary_behavior or behavior_priority.get(b_label, 1) > behavior_priority.get(duck_primary_behavior[tid], 1):
            duck_primary_behavior[tid] = b_label

    behavior_counts = Counter(duck_primary_behavior.values())
    total_detected = len(duck_primary_behavior) if duck_primary_behavior else 1

    behavior_summary = {
        "NORMAL": behavior_counts.get("NORMAL", 0),
        "SUPINE_FLIPPED": behavior_counts.get("SUPINE_FLIPPED", 0),
        "ISOLATED_LOW_MOBILITY": behavior_counts.get("ISOLATED_LOW_MOBILITY", 0),
        "LETHARGIC": behavior_counts.get("LETHARGIC", 0),
        "ISOLATED": behavior_counts.get("ISOLATED", 0),
    }
    abnormal_cnt = sum(cnt for b, cnt in behavior_counts.items() if b != "NORMAL")

    alerts_generated = []
    supine_ducks = [tid for tid, b in duck_primary_behavior.items() if b == "SUPINE_FLIPPED"]
    iso_slow_ducks = [tid for tid, b in duck_primary_behavior.items() if b == "ISOLATED_LOW_MOBILITY"]
    lethargic_ducks = [tid for tid, b in duck_primary_behavior.items() if b == "LETHARGIC"]
    isolated_ducks = [tid for tid, b in duck_primary_behavior.items() if b == "ISOLATED"]

    if supine_ducks:
        alerts_generated.append(
            f"[AI HÀNH VI] Phát hiện {len(supine_ducks)} cá thể có tư thế LẬT NGỬA / CO GIẬT CHÂN (Track #{supine_ducks}). Cảnh báo hành vi nguy cấp, khuyến nghị can thiệp ngay!"
        )
    if iso_slow_ducks:
        alerts_generated.append(
            f"[AI HÀNH VI] Phát hiện {len(iso_slow_ducks)} cá thể TÁCH ĐÀN & GIẢM VẬN ĐỘNG KÉO DÀI (Track #{iso_slow_ducks}). Cảnh báo hành vi bất thường!"
        )
    if lethargic_ducks:
        alerts_generated.append(
            f"[AI HÀNH VI] Phát hiện {len(lethargic_ducks)} cá thể có biểu hiện Ủ RŨ, giảm vận động so với nhịp sinh hoạt chung của đàn (Track #{lethargic_ducks})."
        )
    if isolated_ducks and not iso_slow_ducks:
        alerts_generated.append(
            f"[AI HÀNH VI] Phát hiện {len(isolated_ducks)} cá thể có biểu hiện TÁCH ĐÀN ĐƠN LẺ (Track #{isolated_ducks})."
        )

    return {
        "video_path": video_path,
        "fps": fps,
        "total_frames": total_frames,
        "duration_sec": total_frames / fps if fps else 0.0,
        "total_ducks_detected": total_detected,
        "abnormal_count": abnormal_cnt,
        "behavior_summary": behavior_summary,
        "tracks": tracks,
        "alerts_generated": alerts_generated,
    }


def _make_alert(track_id: int, start_frame: int, end_frame: int, fps: float) -> Dict[str, Any]:
    return {
        "track_id": track_id,
        "start_frame": start_frame,
        "end_frame": end_frame,
        "start_time_sec": round(start_frame / fps, 2) if fps else 0.0,
        "end_time_sec": round(end_frame / fps, 2) if fps else 0.0,
        "duration_sec": round((end_frame - start_frame) / fps, 2) if fps else 0.0,
    }
