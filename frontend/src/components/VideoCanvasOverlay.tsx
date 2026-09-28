'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Eye } from 'lucide-react';
import { AIDetectionTrack } from '@/lib/types';

interface VideoCanvasOverlayProps {
  tracks: AIDetectionTrack[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  durationSeconds?: number;
}

export function VideoCanvasOverlay({
  tracks,
  mediaUrl,
  mediaType = 'video',
  durationSeconds = 15,
}: VideoCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  // Behavior colors mapping
  const behaviorColors: Record<string, { stroke: string; fill: string; label: string }> = {
    NORMAL: { stroke: '#2E7D32', fill: 'rgba(46, 125, 50, 0.2)', label: 'Bình thường' },
    LETHARGIC: { stroke: '#F4A62D', fill: 'rgba(244, 166, 45, 0.25)', label: 'Ủ rũ / Ít vận động' },
    SUPINE_FLIPPED: { stroke: '#9C27B0', fill: 'rgba(156, 39, 176, 0.35)', label: 'Nghi LẬT NGỬA (Nguy hiểm)' },
    ISOLATED: { stroke: '#D32F2F', fill: 'rgba(211, 47, 47, 0.25)', label: 'Tách đàn / Nghi bệnh' },
    FEVER_GROUPING: { stroke: '#FF9800', fill: 'rgba(255, 152, 0, 0.25)', label: 'Tụ tập cụm sốt' },
  };

  // Load image media
  useEffect(() => {
    if (mediaType === 'image' && mediaUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = mediaUrl;
      img.onload = () => {
        imgRef.current = img;
      };
      img.onerror = () => {
        imgRef.current = null;
      };
    } else {
      imgRef.current = null;
    }
  }, [mediaUrl, mediaType]);

  // Sync hidden video playback
  useEffect(() => {
    if (mediaType === 'video' && hiddenVideoRef.current && mediaUrl) {
      if (isPlaying) {
        hiddenVideoRef.current.play().catch(() => {});
      } else {
        hiddenVideoRef.current.pause();
      }
    }
  }, [isPlaying, mediaUrl, mediaType]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying && mediaType !== 'image') {
        setCurrentTime((prev) => {
          const next = prev + dt;
          return next >= durationSeconds ? 0 : next;
        });
      }

      drawFrame();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentTime, tracks, durationSeconds, mediaType, mediaUrl]);

  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    let drawnMedia = false;

    // 1. Draw Media Background (Image or Video)
    if (mediaType === 'image' && imgRef.current && imgRef.current.complete) {
      ctx.drawImage(imgRef.current, 0, 0, width, height);
      drawnMedia = true;
    } else if (mediaType === 'video' && hiddenVideoRef.current && hiddenVideoRef.current.readyState >= 2) {
      ctx.drawImage(hiddenVideoRef.current, 0, 0, width, height);
      drawnMedia = true;
    }

    // Fallback backdrop if no external media loaded
    if (!drawnMedia) {
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#1E293B');
      bgGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Barn grid lines simulation
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Water pool area in barn
      ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.beginPath();
      ctx.ellipse(width * 0.75, height * 0.5, 120, 80, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.stroke();

      if (mediaType === 'image') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillText('HÌNH ẢNH DỮ LIỆU ĐANG PHÂN TÍCH', 20, height - 20);
      }
    }

    // 2. Filter active tracks at current time / frame
    const currentFrameIdx = mediaType === 'image' ? 0 : Math.floor(currentTime * 5);
    const activeTracks = mediaType === 'image' 
      ? (tracks.filter(t => t.frame_index === 0).length > 0 ? tracks.filter(t => t.frame_index === 0) : tracks.slice(0, 5))
      : tracks.filter((t) => t.frame_index === currentFrameIdx);

    // 3. Render Bounding Boxes & Tags
    activeTracks.forEach((track) => {
      const [normX, normY, normW, normH] = track.bbox;
      const x = normX * width;
      const y = normY * height;
      const w = normW * width;
      const h = normH * height;

      const style = behaviorColors[track.behavior_label] || behaviorColors.NORMAL;

      // Fill BBox
      ctx.fillStyle = style.fill;
      ctx.fillRect(x, y, w, h);

      // Stroke BBox
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = track.behavior_label !== 'NORMAL' ? 3 : 2;
      ctx.strokeRect(x, y, w, h);

      // Center dot indicator
      ctx.fillStyle = style.stroke;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Top Tag Badge
      const tagText = `#${track.track_id} ${style.label} (${Math.round(track.confidence * 100)}%)`;
      ctx.font = 'bold 11px system-ui, sans-serif';
      const textWidth = ctx.measureText(tagText).width;

      const tagY = y - 20 > 0 ? y - 20 : y;
      ctx.fillStyle = style.stroke;
      ctx.fillRect(x, tagY, textWidth + 12, 18);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(tagText, x + 6, tagY + 13);
    });

    // 4. Time / Info Overlay Top Left
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(12, 12, 230, 32);
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 12px monospace';
    if (mediaType === 'image') {
      ctx.fillText(`MODE: STILL IMAGE | BBOX: ${activeTracks.length}`, 22, 32);
    } else {
      ctx.fillText(`FRAME: ${currentFrameIdx} | SEC: ${currentTime.toFixed(1)}s`, 22, 32);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden Video element for syncing canvas frame playback when mediaType === 'video' */}
      {mediaType === 'video' && mediaUrl && (
        <video
          ref={hiddenVideoRef}
          src={mediaUrl}
          className="hidden"
          muted
          loop
          playsInline
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) {
              setCurrentTime(v.currentTime);
            }
          }}
        />
      )}

      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group">
        <canvas
          ref={canvasRef}
          width={720}
          height={400}
          className="w-full h-auto object-cover block cursor-pointer"
          onClick={() => setIsPlaying(!isPlaying)}
        />

        {/* Floating status badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 px-3 py-1.5 rounded-full text-xs text-white">
          <Eye className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
          <span>{mediaType === 'image' ? 'Image BBox Analysis' : 'Live Video BBox Overlay'}</span>
        </div>

        {/* Video / Control Bar */}
        {mediaType === 'video' && (
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setCurrentTime(0);
                  if (hiddenVideoRef.current) hiddenVideoRef.current.currentTime = 0;
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 max-w-md flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono w-10">{currentTime.toFixed(1)}s</span>
              <input
                type="range"
                min={0}
                max={durationSeconds}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (hiddenVideoRef.current) hiddenVideoRef.current.currentTime = val;
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <span className="text-xs text-slate-400 font-mono w-10">{durationSeconds}s</span>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Tốc độ: <span className="text-white font-bold">5 FPS</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(behaviorColors).map(([key, item]) => (
          <div key={key} className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.stroke }}></span>
            <div>
              <p className="text-xs font-bold text-slate-800">{item.label}</p>
              <p className="text-[10px] text-slate-500 font-mono">Status: {key}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
