@echo off
chcp 65001 >nul
title DuckCare AI - Khoi Dong He Thong
echo ========================================================
echo   KHOI DONG HE THONG DUCKCARE AI (LOCAL FULL YOLO PIPELINE)
echo ========================================================
echo.
echo 1. Dang khoi dong Backend FastAPI (tich hop YOLO & BoT-SORT) tai cong 8001...
start "DuckCare Backend (FastAPI + YOLO AI)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --port 8001 --reload"

echo 2. Dang khoi dong Frontend Next.js tai cong 3000...
start "DuckCare Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo   HE THONG DANG CHAY TAI:
echo   - Giao dien Web: http://localhost:3000
echo   - Phan he AI:    http://localhost:3000/ai
echo   - API Backend:   http://localhost:8001/api/v1
echo ========================================================
echo.
echo Dang mo trinh duyet...
timeout /t 6 >nul
start http://localhost:3000/ai
