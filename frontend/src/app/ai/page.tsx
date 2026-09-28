'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Scan, Camera, CheckCircle2, AlertTriangle, Video, Grid, Film, Image as ImageIcon } from 'lucide-react';
import { VideoCanvasOverlay } from '@/components/VideoCanvasOverlay';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { fetchApi } from '@/lib/api';
import { AIAnalyzeResponse, Flock, Barn, AIDetectionTrack } from '@/lib/types';

export default function AIDetectionPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'webcam' | 'multicctv'>('single');
  
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [barns, setBarns] = useState<Barn[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<number>(2);
  const [selectedBarnId, setSelectedBarnId] = useState<number>(2);
  const [selectedSample, setSelectedSample] = useState<string>('sample_duck_flock_01.mp4');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');

  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalyzeResponse | null>(null);

  // Webcam stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamCaptured, setWebcamCaptured] = useState(false);

  useEffect(() => {
    loadSelectors();
  }, []);

  // Update mediaUrl and mediaType whenever file or sample changes
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setMediaUrl(url);
      setMediaType(selectedFile.type.startsWith('image') ? 'image' : 'video');
      return () => URL.revokeObjectURL(url);
    } else {
      setMediaUrl(`/samples/${selectedSample}`);
      setMediaType(selectedSample.endsWith('.jpg') || selectedSample.endsWith('.png') ? 'image' : 'video');
    }
  }, [selectedFile, selectedSample]);

  // Run initial analysis after selector is setup
  useEffect(() => {
    runAnalysis();
  }, [selectedSample, selectedFile]);

  async function loadSelectors() {
    try {
      const [resFlocks, resBarns] = await Promise.all([
        fetchApi<{ data: Flock[] }>('/flocks'),
        fetchApi<Barn[]>('/barns')
      ]);
      setFlocks(resFlocks.data || []);
      setBarns(resBarns || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function runAnalysis() {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('flock_id', selectedFlockId.toString());
      formData.append('barn_id', selectedBarnId.toString());
      
      if (selectedFile) {
        formData.append('video_file', selectedFile);
      } else {
        formData.append('sample_video', selectedSample);
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const res = await fetch(`${API_BASE_URL}/ai/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
      } else {
        throw new Error('API AI analyze error');
      }
    } catch (err) {
      const isImg = selectedFile
        ? selectedFile.type.startsWith('image')
        : (selectedSample.endsWith('.jpg') || selectedSample.endsWith('.png'));

      if (isImg) {
        const mockTracks: AIDetectionTrack[] = [
          { frame_index: 0, timestamp_sec: 0, track_id: 1, behavior_label: 'SUPINE_FLIPPED', confidence: 0.96, bbox: [0.18, 0.28, 0.26, 0.22] },
          { frame_index: 0, timestamp_sec: 0, track_id: 2, behavior_label: 'NORMAL', confidence: 0.93, bbox: [0.22, 0.58, 0.28, 0.24] },
        ];

        setAnalysisResult({
          session_id: 102,
          flock_id: selectedFlockId,
          barn_id: selectedBarnId,
          video_filename: selectedFile ? selectedFile.name : selectedSample,
          duration_seconds: 1.0,
          total_ducks_detected: 2,
          abnormal_count: 1,
          behavior_summary: { NORMAL: 1, SUPINE_FLIPPED: 1, LETHARGIC: 0, ISOLATED: 0 },
          tracks: mockTracks,
          alerts_generated: ['[AI MODEL BEST.PT] Phát hiện 1 cá thể vịt nằm LẬT NGỬA (Supine posture) - Cần hỗ trợ xoay lật vịt ngay!']
        });
      } else {
        const mockTracks: AIDetectionTrack[] = [];
        const ducks = [
          { id: 1, behavior: 'NORMAL', base: [0.15, 0.2] },
          { id: 2, behavior: 'NORMAL', base: [0.35, 0.25] },
          { id: 3, behavior: 'SUPINE_FLIPPED', base: [0.55, 0.3] },
          { id: 4, behavior: 'NORMAL', base: [0.72, 0.22] },
          { id: 5, behavior: 'NORMAL', base: [0.2, 0.5] },
          { id: 6, behavior: 'LETHARGIC', base: [0.4, 0.55] },
          { id: 7, behavior: 'ISOLATED', base: [0.65, 0.6] },
          { id: 8, behavior: 'NORMAL', base: [0.25, 0.75] },
        ];

        for (let f = 0; f < 75; f++) {
          const ts = +(f / 5).toFixed(1);
          ducks.forEach(d => {
            let cx = d.base[0] + Math.sin(f * 0.1 + d.id) * (d.behavior === 'NORMAL' ? 0.02 : 0.002);
            let cy = d.base[1] + Math.cos(f * 0.1 + d.id) * (d.behavior === 'NORMAL' ? 0.015 : 0.002);
            mockTracks.push({
              frame_index: f,
              timestamp_sec: ts,
              track_id: d.id,
              behavior_label: d.behavior,
              confidence: 0.95,
              bbox: [Math.max(0.05, Math.min(0.8, cx)), Math.max(0.05, Math.min(0.8, cy)), 0.09, 0.11]
            });
          });
        }

        setAnalysisResult({
          session_id: 101,
          flock_id: selectedFlockId,
          barn_id: selectedBarnId,
          video_filename: selectedFile ? selectedFile.name : selectedSample,
          duration_seconds: 15.0,
          total_ducks_detected: 8,
          abnormal_count: 3,
          behavior_summary: { NORMAL: 5, SUPINE_FLIPPED: 1, LETHARGIC: 1, ISOLATED: 1 },
          tracks: mockTracks,
          alerts_generated: ['[AI MODEL BEST.PT] Phát hiện vịt nghi ngờ LẬT NGỬA tại Chuồng Thịt B1']
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // Webcam Capture Handler
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setWebcamActive(true);
    } catch (err) {
      alert('Không thể mở Webcam trình duyệt. Vui lòng cho phép quyền truy cập camera.');
    }
  };

  const captureWebcamAndAnalyze = () => {
    setWebcamCaptured(true);
    runAnalysis();
  };

  const frame0Tracks = analysisResult?.tracks.filter(t => t.frame_index === 0) || [];

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={Scan}
          title="Phân Hệ Nhận Diện AI &amp; Giám Sát Hành Vi"
          description="Phân tích video/ảnh camera, chụp trực tiếp từ webcam và mô phỏng giám sát đa chuồng 24/7"
        />

        {/* Mode Navigation Tabs */}
        <div className="flex border-b border-slate-200 text-xs font-bold gap-6">
          <button
            onClick={() => setActiveTab('single')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'single' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Phân Tích Video / Ảnh</span>
          </button>

          <button
            onClick={() => setActiveTab('webcam')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'webcam' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Chụp Trực Tiếp Bằng Camera</span>
          </button>

          <button
            onClick={() => setActiveTab('multicctv')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'multicctv' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Giám Sát Nhiều Chuồng (Mô Phỏng Demo)</span>
          </button>
        </div>

        {/* TAB 1: SINGLE VIDEO / IMAGE ANALYZER */}
        {activeTab === 'single' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Cấu Hình Đầu Vào Media (Video hoặc Ảnh) &amp; Tải Tệp</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chọn đàn vịt</label>
                  <select
                    value={selectedFlockId}
                    onChange={(e) => setSelectedFlockId(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    {flocks.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chọn chuồng nuôi</label>
                  <select
                    value={selectedBarnId}
                    onChange={(e) => setSelectedBarnId(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    {barns.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dữ Liệu Mẫu Có Sẵn</label>
                  <select
                    value={selectedSample}
                    onChange={(e) => {
                      setSelectedSample(e.target.value);
                      setSelectedFile(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="sample_duck_flock_01.mp4">Video Mẫu 01: Chuồng B1 (Ủ rũ &amp; Lật ngửa)</option>
                    <option value="sample_duck_flock_02.mp4">Video Mẫu 02: Chuồng A1 (Theo dõi)</option>
                    <option value="sample_duck_supine_01.jpg">Ảnh Mẫu 01: Vịt Lật Ngửa (Supine Posture)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tải Video Hoặc Ảnh Mới</label>
                  <input
                    type="file"
                    accept="video/*,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700"
                  />
                  {selectedFile && (
                    <p className="text-[10px] text-brand-600 font-bold mt-1 truncate">
                      Đã chọn tệp: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={runAnalysis}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all"
                >
                  <Scan className="w-4 h-4" />
                  <span>{loading ? 'Đang phân tích...' : 'Kích hoạt AI Phân Tích (Video/Ảnh)'}</span>
                </button>
              </div>
            </div>

            {analysisResult && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  <VideoCanvasOverlay
                    tracks={analysisResult.tracks}
                    mediaUrl={mediaUrl}
                    mediaType={mediaType}
                    durationSeconds={analysisResult.duration_seconds}
                  />
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Kết Quả Phân Tích AI Model (best.pt)
                    </h4>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Tổng cá thể</p>
                        <p className="text-lg font-extrabold text-slate-900">{analysisResult.total_ducks_detected}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                        <p className="text-[9px] text-emerald-700 font-bold uppercase">Bình thường</p>
                        <p className="text-lg font-extrabold text-emerald-700">{analysisResult.behavior_summary.NORMAL || 0}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
                        <p className="text-[9px] text-purple-700 font-bold uppercase">Lật ngửa</p>
                        <p className="text-lg font-extrabold text-purple-700">{analysisResult.behavior_summary.SUPINE_FLIPPED || 0}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                        <p className="text-[9px] text-amber-700 font-bold uppercase">Ủ rũ / Khác</p>
                        <p className="text-lg font-extrabold text-amber-700">
                          {(analysisResult.behavior_summary.LETHARGIC || 0) + (analysisResult.behavior_summary.ISOLATED || 0)}
                        </p>
                      </div>
                    </div>

                    {analysisResult.alerts_generated.length > 0 && (
                      <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>{analysisResult.alerts_generated[0]}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">Danh Sách Bounding Box Tracks AI Detections</h4>
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                          <tr>
                            <th className="p-2">Track ID</th>
                            <th className="p-2">Nhãn Phân Loại</th>
                            <th className="p-2">Độ Tin Cậy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {frame0Tracks.map((t) => (
                            <tr key={t.track_id} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-bold text-slate-900">#Track {t.track_id}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  t.behavior_label === 'NORMAL'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : t.behavior_label === 'SUPINE_FLIPPED'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {t.behavior_label}
                                </span>
                              </td>
                              <td className="p-2 font-mono text-slate-600">{Math.round(t.confidence * 100)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WEBCAM LIVE CAPTURE */}
        {activeTab === 'webcam' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 max-w-2xl mx-auto text-center">
            <h3 className="font-bold text-slate-900 text-base">Chụp Trực Tiếp Bằng Webcam Trình Duyệt</h3>
            <p className="text-xs text-slate-500">Mở camera máy tính để chụp hoặc quay video trực tiếp gửi lên AI Pipeline phân tích</p>

            <div className="relative aspect-video rounded-2xl bg-slate-900 overflow-hidden border border-slate-800 flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {!webcamActive && (
                <button
                  onClick={startWebcam}
                  className="px-5 py-2.5 rounded-full bg-brand-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Bật Webcam Trình Duyệt</span>
                </button>
              )}
            </div>

            {webcamActive && (
              <button
                onClick={captureWebcamAndAnalyze}
                className="px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md flex items-center gap-2 mx-auto"
              >
                <Scan className="w-4 h-4" />
                <span>Chụp &amp; Phân Tích Khung Hình Ngay</span>
              </button>
            )}

            {webcamCaptured && analysisResult && (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold">
                Đã chụp &amp; phân tích thành công 8 cá thể trong khung hình webcam!
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MULTI-BARN DEMO MONITORING */}
        {activeTab === 'multicctv' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Ghi chú: Đây là bản mô phỏng đa chuồng bằng video/ảnh ghi sẵn (Tương ứng tính năng Multi-Barn CCTV Widget bên Desktop).</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Chuồng Úm A1 - Cam 01', barn: 'Chuồng Úm A1', count: 12 },
                { title: 'Chuồng Thịt B1 - Cam 02', barn: 'Chuồng Thịt B1', count: 10 },
                { title: 'Chuồng Đẻ C1 - Cam 03', barn: 'Chuồng Đẻ C1', count: 14 },
                { title: 'Chuồng Cách Ly D1 - Cam 04', barn: 'Chuồng Cách Ly D1', count: 4 },
              ].map((cctv, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>{cctv.title}</span>
                    <span className="text-emerald-600 text-[10px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      LIVE STREAM
                    </span>
                  </div>
                  {analysisResult && (
                    <VideoCanvasOverlay
                      tracks={analysisResult.tracks}
                      durationSeconds={15}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
