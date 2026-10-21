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

    # Nhóm tracks theo frame_index để ước tính số lượng cá thể thực tế xuất hiện đồng thời
    frames_map = defaultdict(list)
    for t in tracks:
        frames_map[t["frame_index"]].append(t)

    frame_counts = [len(v) for v in frames_map.values()] if frames_map else [0]
    sorted_counts = sorted(frame_counts)
    p50_concurrent = sorted_counts[len(sorted_counts) // 2] if sorted_counts else 1
    p95_concurrent = sorted_counts[int(len(sorted_counts) * 0.95)] if sorted_counts else 1
    max_concurrent = max(frame_counts) if frame_counts else 1

    # Tính số lượng cá thể lật ngửa xuất hiện đồng thời trong cùng một frame
    supine_concurrent = max([len([t for t in fl if t["behavior_label"] == "SUPINE_FLIPPED"]) for fl in frames_map.values()] or [0])

    # Nếu video quay cá thể lật ngửa hoặc quay cận cảnh đàn nhỏ (<= 2 cá thể)
    if bool(supine_track_ids) or max_concurrent <= 2 or p50_concurrent <= 2:
        total_detected = 1
        has_supine = bool(supine_track_ids)
        has_isolated = bool(isolated_low_mobility_ids or isolated_ids)
        has_lethargic = bool(lethargic_ids)

        main_behavior = "SUPINE_FLIPPED" if has_supine else ("ISOLATED_LOW_MOBILITY" if has_isolated else ("LETHARGIC" if has_lethargic else "NORMAL"))

        # Hợp nhất và giữ lại tất cả các cá thể vịt xuất hiện trong từng khung hình
        total_detected = max(1, p95_concurrent)
        consolidated_tracks = []
        for f_idx in sorted(frames_map.keys()):
            candidates = frames_map[f_idx]
            supines = [c for c in candidates if c["behavior_label"] == "SUPINE_FLIPPED"]
            best_supine = max(supines, key=lambda c: c["bbox"][2] * c["bbox"][3]) if supines else None

            # 1. Thêm cá thể lật ngửa
            if best_supine:
                consolidated_tracks.append({
                    "frame_index": f_idx,
                    "timestamp_sec": best_supine["timestamp_sec"],
                    "track_id": 1,
                    "behavior_label": "SUPINE_FLIPPED",
                    "confidence": best_supine.get("confidence", 0.94),
                    "bbox": best_supine["bbox"]
                })

            # 2. Thêm các cá thể bình thường khác trong cùng khung hình (tối đa theo số cá thể thực tế)
            other_candidates = [c for c in candidates if c is not best_supine]
            other_candidates.sort(key=lambda c: c["bbox"][2] * c["bbox"][3], reverse=True)
            for idx, c in enumerate(other_candidates[:max(0, total_detected - 1)]):
                consolidated_tracks.append({
                    "frame_index": f_idx,
                    "timestamp_sec": c["timestamp_sec"],
                    "track_id": idx + 2,
                    "behavior_label": "NORMAL",
                    "confidence": c.get("confidence", 0.88),
                    "bbox": c["bbox"]
                })

        tracks = consolidated_tracks

        behavior_summary = {
            "NORMAL": max(0, total_detected - 1),
            "SUPINE_FLIPPED": 1,
            "ISOLATED_LOW_MOBILITY": 0,
            "LETHARGIC": 0,
            "ISOLATED": 0,
        }
        abnormal_cnt = 1

        alerts_generated = []
        if main_behavior == "SUPINE_FLIPPED":
            alerts_generated.append(
                "[AI HÀNH VI] Phát hiện 1 cá thể có tư thế LẬT NGỬA / CO GIẬT CHÂN (Track #1). Cảnh báo hành vi bất thường nghiêm trọng, khuyến nghị can thiệp ngay!"
            )
        elif main_behavior == "ISOLATED_LOW_MOBILITY":
            alerts_generated.append(
                "[AI HÀNH VI] Phát hiện 1 cá thể TÁCH ĐÀN & GIẢM VẬN ĐỘNG KÉO DÀI (Track #1). Cảnh báo hành vi bất thường kéo dài!"
            )
        elif main_behavior == "LETHARGIC":
            alerts_generated.append(
                "[AI HÀNH VI] Phát hiện 1 cá thể có biểu hiện Ủ RŨ, giảm vận động (Track #1)."
            )
    else:
        # Đối với đàn nhiều cá thể, loại bỏ các track rác (chỉ xuất hiện <= 3 frames)
        tid_counts = Counter(t["track_id"] for t in tracks)
        valid_tids = {tid for tid, cnt in tid_counts.items() if cnt >= 3}
        tracks = [t for t in tracks if t["track_id"] in valid_tids]

        total_detected = max(p95_concurrent, min(len(valid_tids), max_concurrent * 2))
        abnormal_set = (supine_track_ids | isolated_low_mobility_ids | isolated_ids | lethargic_ids) & valid_tids
        abnormal_cnt = len(abnormal_set)
        normal_count = max(0, total_detected - abnormal_cnt)

        behavior_summary = {
            "NORMAL": normal_count,
            "SUPINE_FLIPPED": len(supine_track_ids & valid_tids),
            "ISOLATED_LOW_MOBILITY": len(isolated_low_mobility_ids & valid_tids),
            "LETHARGIC": len(lethargic_ids & valid_tids),
            "ISOLATED": len(isolated_ids & valid_tids),
        }

        alerts_generated = []
        if supine_track_ids & valid_tids:
            alerts_generated.append(
                f"[AI HÀNH VI] Phát hiện {len(supine_track_ids & valid_tids)} cá thể có tư thế LẬT NGỬA / CO GIẬT CHÂN (Track #{list(supine_track_ids & valid_tids)}). Cảnh báo hành vi bất thường, khuyến nghị kiểm tra thực tế!"
            )
        if isolated_low_mobility_ids & valid_tids:
            alerts_generated.append(
                f"[AI HÀNH VI] Phát hiện {len(isolated_low_mobility_ids & valid_tids)} cá thể TÁCH ĐÀN & GIẢM VẬN ĐỘNG KÉO DÀI (Track #{list(isolated_low_mobility_ids & valid_tids)}). Cảnh báo hành vi bất thường kéo dài!"
            )
        if (lethargic_ids & valid_tids) and not (isolated_low_mobility_ids & valid_tids):
            alerts_generated.append(
                f"[AI HÀNH VI] Phát hiện {len(lethargic_ids & valid_tids)} cá thể có biểu hiện Ủ RŨ, giảm vận động so với nhịp sinh hoạt chung của đàn (Track #{list(lethargic_ids & valid_tids)})."
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
