# 🦆 DuckCare AI - Web App System (Bản Demo Độc Lập)

> **LƯU Ý QUAN TRỌNG VỀ ĐỒ ÁN:**
> Đây là bản **WEB APP ĐỘC LẬP** được xây dựng thêm nhằm mục đích **DEMO BÁO CÁO TRƯỚC HỘI ĐỒNG CHẤM ĐỒ ÁN & NHÀ ĐẦU TƯ**.
> - **Không thay thế** bản Desktop (Python/PyQt6/SQLite dành cho nông dân).
> - **Không đồng bộ dữ liệu 2 chiều** với bản Desktop.
> - **Mục đích:** Minh họa kiến trúc Web Client-Server RESTful API hiện đại, cơ sở dữ liệu server thực tế (PostgreSQL), giao diện chuẩn Design System sang trọng/chuyên nghiệp và khả năng mở rộng multi-user/multi-farm trong tương lai của hệ thống.

---

## 🛠️ TECH STACK & KIẾN TRÚC HỆ THỐNG

### 1. Backend (API Server)
- **Framework:** FastAPI (Python 3.11) - Xử lý bất đồng bộ Async/Await hiệu năng cao.
- **ORM & Migration:** SQLAlchemy (asyncio) + Alembic.
- **Cơ sở dữ liệu:** PostgreSQL (Server thực tế), tích hợp tính năng tự động chuyển đổi **SQLite Fallback** khi chạy local không có server Postgres.
- **Xác thực & Phân quyền:** JWT (Access Token & Refresh Token) phân quyền chi tiết theo 4 vai trò:
  - `ADMIN`: Quản trị hệ thống, quản lý người dùng.
  - `FARM_MANAGER`: Quản lý trang trại, thêm/sửa đàn, chuồng, kho.
  - `VETERINARIAN`: Quản lý bệnh án, phác đồ điều trị, lịch tiêm phòng.
  - `STAFF`: Nhân viên ghi nhận nhật ký sản lượng hàng ngày.
- **AI Processing Engine:** Endpoint `/api/v1/ai/analyze` nhận diện hành vi gia cầm (Normal, Lethargic, Isolated, Fever Grouping) xuất ra danh sách Bounding Box Tracks theo mốc thời gian video.

### 2. Frontend (Web Application)
- **Framework:** Next.js 14 (React 18) App Router + TypeScript.
- **Styling & Design System:** TailwindCSS (Màu chủ đạo xanh lá `#2E7D32`, nền trắng ngà `#F5F5F0`, nút phụ `#F4A62D`, cảnh báo `#D32F2F`).
- **Icon Library:** 100% Lucide React SVG components (Không sử dụng emoji Unicode).
- **Visualization:** Recharts (Biểu đồ sản lượng & thức ăn), HTML5 Canvas Overlay (Vẽ Bounding Box AI đè lên Video Player realtime).

---

## 📁 CẤU TRÚC THƯ MỤC PROJECT

```text
duck_web/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py          # JWT Login & Refresh token
│   │   │   │   ├── dashboard.py     # KPI stats & chart trend endpoints
│   │   │   │   ├── barns.py         # CRUD chuồng nuôi & sức chứa
│   │   │   │   ├── flocks.py        # CRUD đàn vịt & detail tabs
│   │   │   │   ├── production.py    # Nhật ký sản lượng trứng & hao hụt
│   │   │   │   ├── inventory.py     # Kho vật tư & nhập/xuất kho
│   │   │   │   ├── veterinary.py    # Bệnh án & Lịch tiêm phòng vắc xin
│   │   │   │   ├── ai.py            # AI Video BBox Detection & Alerts
│   │   │   │   ├── reports.py       # Báo cáo tổng hợp & Xuất Excel
│   │   │   │   ├── users.py         # Quản lý tài khoản (ADMIN)
│   │   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── config.py            # Configuration & Settings
│   │   │   ├── database.py          # Async Engine & SQLite Auto-fallback
│   │   │   └── security.py          # Password Hashing & JWT Utils
│   │   ├── models/models.py         # SQLAlchemy Async ORM Entities
│   │   ├── schemas/schemas.py       # Pydantic Data Validation Schemas
│   │   └── main.py                  # FastAPI Application Entrypoint
│   ├── seed.py                      # Script khởi tạo dữ liệu mẫu thực tế
│   ├── requirements.txt             # Danh sách thư viện Python
│   ├── .env                         # Biến môi trường local
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Landing Hero (Chuẩn ảnh tham khảo)
│   │   │   ├── login/page.tsx       # Đăng nhập JWT + Nút Login nhanh 4 role
│   │   │   ├── dashboard/page.tsx   # Bảng điều khiển KPI & Biểu đồ
│   │   │   ├── flocks/page.tsx      # Quản lý đàn & Modal Tabs chi tiết
│   │   │   ├── barns/page.tsx       # Quản lý chuồng & Thanh sức chứa
│   │   │   ├── inventory/page.tsx   # Kho vật tư & Nhập/Xuất kho
│   │   │   ├── veterinary/page.tsx  # Thú y, danh mục bệnh & tiêm phòng
│   │   │   ├── ai/page.tsx          # Nhận diện AI + Overlay BBox Video
│   │   │   ├── reports/page.tsx     # Báo cáo & Xuất file Excel (XLSX)
│   │   │   ├── users/page.tsx       # Phân quyền tài khoản (ADMIN)
│   │   │   ├── globals.css
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx           # Header cố định + Pill Navigation
│   │   │   ├── Footer.tsx           # Footer chuyên nghiệp
│   │   │   └── VideoCanvasOverlay.tsx # Live Bounding Box Canvas Renderer
│   │   └── lib/
│   │       ├── api.ts               # API Client & Offline Fallback
│   │       ├── auth-context.tsx     # Auth State Provider
│   │       └── types.ts             # TypeScript Interfaces
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml               # File Docker 1-lệnh chạy toàn bộ hệ thống
└── README.md                        # Hướng dẫn chạy & deploy
```

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN (LOCAL DEVELOPMENT)

Hệ thống hoạt động **trực tiếp qua venv (Python) và npm (Node.js)**, kết nối trực tiếp tới Cơ sở dữ liệu **PostgreSQL Cloud (Neon / Supabase)** làm nguồn dữ liệu duy nhất (không cần cài đặt Docker).

---

### Bước 1: Tạo Database PostgreSQL Cloud & Cấu Hình Môi Trường

#### a) Tạo Database trên Nhà Cung Cấp Cloud (Nên chọn 1 trong 2):
- **Lựa chọn 1 - Neon.tech (Khuyên dùng - Nhanh nhất):**
  1. Truy cập `https://neon.tech` và đăng ký tài khoản miễn phí.
  2. Tạo mới dự án (Project Name: `DuckCare-AI`).
  3. Sao chép chuỗi kết nối **Connection String** dạng:
     `postgresql://user:password@ep-xyz.neon.tech/duck_farm_db?sslmode=require`
- **Lựa chọn 2 - Supabase.com:**
  1. Truy cập `https://supabase.com` và tạo Project mới.
  2. Tại phần **Project Settings ➔ Database**, lấy chuỗi **URI Connection String** dạng:
     `postgresql://postgres:password@db.xyz.supabase.co:5432/postgres`

#### b) Cấu hình File `backend/.env`:
Mở file `backend/.env` và cập nhật biến `DATABASE_URL` (Thay bằng chuỗi kết nối Cloud của bạn):

```env
USE_SQLITE=false
DATABASE_URL=postgresql+asyncpg://user:password@ep-xyz.neon.tech/duck_farm_db?ssl=require
SECRET_KEY=duckcare_ai_super_secret_jwt_key_2026_nckh_pro_key
```

> **Lưu ý về SSL:** Hệ thống tự động chuyển đổi `sslmode=require` (của psycopg2) thành `ssl=require` (của driver asyncpg) khi khởi tạo kết nối. Bạn chỉ cần copy-paste trực tiếp connection string từ nhà cung cấp Cloud vào `.env`.

---

### Bước 2: Chạy Backend (FastAPI Server)

Mở Terminal tại thư mục gốc dự án:

```bash
cd backend

# 1. Cài đặt thư viện Python
pip install -r requirements.txt

# 2. Khởi tạo bảng và nạp dữ liệu mẫu vào PostgreSQL Cloud
python seed.py

# 3. Chạy Server FastAPI
uvicorn app.main:app --reload --port 8001
```

*(Lưu ý: Backend được thiết kế Fail-Fast — ngắt ngay lập tức với thông báo rõ ràng nếu thông tin `DATABASE_URL` không kết nối được PostgreSQL Cloud, không bao giờ âm thầm rơi về SQLite).*

---

### Bước 3: Chạy Frontend (Next.js Web Client)

Mở một Terminal mới tại thư mục gốc dự án:

```bash
cd frontend

# 1. Cài đặt thư viện Node.js
npm install

# 2. Chạy môi trường Development
npm run dev
```

Truy cập giao diện Web tại: **`http://localhost:3000`**.

---

### Bước 4: Xác Minh Kết Nối & Kiểm Tra Trạng Thái

1. **Xác minh qua Health API:**
   Mở trình duyệt hoặc Postman truy cập: `http://localhost:8001/api/v1/health`
   Kết quả JSON xác nhận kết nối trực tiếp Cloud Database:
   ```json
   {
     "status": "healthy",
     "database_engine": "postgresql",
     "database_host": "ep-xyz.neon.tech",
     "database_name": "duck_farm_db",
     "connection_status": "connected",
     "server_time": "2026-09-27 01:12:00"
   }
   ```

2. **Xác minh qua Script Tiện Ích:**
   Tại thư mục `backend`, chạy lệnh:
   ```bash
   python scripts/check_db.py
   ```
   Script sẽ in ra tên Host, trạng thái kết nối và số lượng dòng dữ liệu thực tế của từng bảng trên Cloud DB.

#### Step 2: Chạy Frontend (Next.js)
Mở một terminal mới:
```bash
cd frontend

# 1. Cài đặt thư viện Node.js
npm install

# 2. Chạy môi trường Development
npm run dev
```
Truy cập giao diện Web tại: `http://localhost:3000`.

---

## 🔑 TÀI KHOẢN MẪU ĐỂ DEMO TRƯỚC HỘI ĐỒNG

Hệ thống cung cấp sẵn **4 Nút Đăng Nhập Nhanh (Quick Login)** tại trang Đăng nhập (`/login`) giúp giảng viên & hội đồng chuyển đổi qua lại giữa các vai trò để kiểm tra phân quyền:

| Vai Trò | Username | Password | Quyền Hạn Nổi Bật |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin` | `password123` | Toàn quyền hệ thống, Quản lý tài khoản người dùng (`/users`) |
| **Quản lý trang trại (FARM_MANAGER)** | `manager` | `password123` | Thêm/Sửa Đàn, Chuồng nuôi, Kho vật tư, duyệt lịch tiêm |
| **Bác sĩ thú y (VETERINARIAN)** | `vet` | `password123` | Lập bệnh án thú y, kê phác đồ điều trị, lên lịch tiêm phòng |
| **Nhân viên (STAFF)** | `staff` | `password123` | Ghi nhận sản lượng trứng, tỷ lệ hao hụt & lượng thức ăn |

---

## 🌐 HƯỚNG DẪN DEPLOY ONLINE CÓ LINK TRUY CẬP TRỰC TIẾP

Để gửi link demo online trực tiếp cho Hội đồng chấm đồ án:

### 1. Deploy Database PostgreSQL
- Đăng ký tài khoản miễn phí tại **Supabase** (`supabase.com`) hoặc **Render** (`render.com`).
- Tạo cơ sở dữ liệu PostgreSQL mới và lấy chuỗi `DATABASE_URL` (dạng `postgresql://user:password@host:5432/dbname`).

### 2. Deploy Backend lên Render.com / Railway.app
- Tạo mới **Web Service** trên Render kết nối với thư mục `backend/`.
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python seed.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Cấu hình Environment Variables:**
  - `DATABASE_URL`: `postgresql+asyncpg://...` (Link Postgres ở bước 1)
  - `SECRET_KEY`: `duckcare_ai_super_secret_jwt_key_2026_nckh_pro_key`
  - `USE_SQLITE`: `false`

### 3. Deploy Frontend lên Vercel.com
- Import repository lên **Vercel** và chọn Root Directory là `frontend`.
- **Cấu hình Environment Variables:**
  - `NEXT_PUBLIC_API_URL`: `https://your-backend-service.onrender.com/api/v1` (URL API Backend ở bước 2).
- Nhấn **Deploy**. Vercel sẽ cung cấp link trực tiếp (Ví dụ: `https://duckcare-ai.vercel.app`).

---

## 🎨 ĐẶC ĐIỂM DESIGN SYSTEM
- **Bảng màu đồng bộ thương hiệu:**
  - Xanh lá đậm chủ đạo: `#2E7D32` (Khớp đúng mã màu bản Desktop)
  - Nền nội dung mềm mại: Trắng ngà `#F5F5F0`
  - Nút phụ & nhấn: Vàng đất `#F4A62D`
  - Cảnh báo nguy cấp: Đỏ `#D32F2F`
- **Layout Hero Section:** Thiết kế bám sát phong cách NCKH chuyên nghiệp (Nền gradient xanh lá đậm, pill tag phía trên tiêu đề, khối số liệu 2-line lớn, card thống kê tối màu bên phải).
- **Bộ Icon:** 100% SVG Vector qua `lucide-react`, tuyệt đối không dùng emoji Unicode.

---

## 📋 BẢNG ÁNH XẠ MODEL ↔ ENDPOINT CHÍNH THỨC (WEB & DESKTOP SYNC)

Tài liệu tham chiếu duy nhất về danh sách API RESTful cho cả Web Client và Desktop Client (PyQt6).
Tất cả các endpoint GET danh sách đều hỗ trợ Query Parameter `?updated_since=<ISO Datetime>` để hỗ trợ cơ chế PULL đồng bộ dữ liệu theo thời gian thực:

| Model | Method | Path Đầy Đủ | Hỗ Trợ `updated_since` | Mô Tả Chức Năng |
| :--- | :---: | :--- | :---: | :--- |
| **User** | `POST` | `/api/v1/auth/login` | - | Đăng nhập lấy Bearer JWT Token |
| **User** | `GET` | `/api/v1/users/me` | - | Lấy thông tin user đăng nhập |
| **User** | `GET` | `/api/v1/users` | - | Danh sách tài khoản |
| **Barn** | `GET` | `/api/v1/barns` |  | Danh sách chuồng nuôi |
| **Barn** | `POST` | `/api/v1/barns` | - | Tạo chuồng nuôi mới |
| **Barn** | `GET` | `/api/v1/barns/{id}` | - | Chi tiết chuồng nuôi |
| **Barn** | `PUT` | `/api/v1/barns/{id}` | - | Cập nhật thông tin chuồng |
| **Barn** | `DELETE` | `/api/v1/barns/{id}` | - | Xóa chuồng nuôi |
| **Camera** | `GET` | `/api/v1/cameras` |  | Danh sách Camera giám sát |
| **Camera** | `POST` | `/api/v1/cameras` | - | Thêm Camera mới |
| **Camera** | `PUT` | `/api/v1/cameras/{id}` | - | Cập nhật Camera |
| **Camera** | `DELETE` | `/api/v1/cameras/{id}` | - | Xóa Camera |
| **Flock** | `GET` | `/api/v1/flocks` |  | Danh sách đàn vịt |
| **Flock** | `POST` | `/api/v1/flocks` | - | Tạo đàn vịt mới |
| **Flock** | `GET` | `/api/v1/flocks/{id}` | - | Chi tiết đàn vịt |
| **Flock** | `PUT` | `/api/v1/flocks/{id}` | - | Cập nhật đàn vịt |
| **Flock** | `DELETE` | `/api/v1/flocks/{id}` | - | Xóa đàn vịt |
| **FlockEvent** | `GET` | `/api/v1/flocks/{flock_id}/events` |  | Danh sách sự kiện theo đàn |
| **FlockEvent** | `POST` | `/api/v1/flocks/{flock_id}/events` | - | Tạo sự kiện cho đàn |
| **FlockEvent** | `GET` | `/api/v1/flock-events` |  | Danh sách toàn bộ sự kiện |
| **FlockEvent** | `POST` | `/api/v1/flock-events` | - | Tạo sự kiện độc lập |
| **FlockEvent** | `GET` | `/api/v1/flock-events/{id}` | - | Chi tiết sự kiện |
| **ProductionRecord** | `GET` | `/api/v1/production` |  | Danh sách nhật ký sản lượng |
| **ProductionRecord** | `POST` | `/api/v1/production` | - | Ghi nhận sản lượng trứng/hao hụt |
| **InventoryCategory** | `GET` | `/api/v1/inventory/categories` |  | Danh sách danh mục kho |
| **InventoryCategory** | `POST` | `/api/v1/inventory/categories` | - | Tạo danh mục kho mới |
| **InventoryItem** | `GET` | `/api/v1/inventory/items` |  | Danh sách vật tư kho |
| **InventoryItem** | `POST` | `/api/v1/inventory/items` | - | Thêm vật tư kho mới |
| **InventoryItem** | `PUT` | `/api/v1/inventory/items/{id}` | - | Cập nhật vật tư kho |
| **InventoryTransaction**| `GET` | `/api/v1/inventory/transactions` |  | Lịch sử giao dịch nhập/xuất kho |
| **InventoryTransaction**| `POST` | `/api/v1/inventory/transactions` | - | Tạo phiếu nhập/xuất kho |
| **Disease** | `GET` | `/api/v1/veterinary/diseases` |  | Danh mục bệnh thú y |
| **Disease** | `POST` | `/api/v1/veterinary/diseases` | - | Thêm bệnh thú y mới |
| **VeterinaryRecord** | `GET` | `/api/v1/veterinary/records` |  | Danh sách bệnh án thú y |
| **VeterinaryRecord** | `POST` | `/api/v1/veterinary/records` | - | Lập bệnh án thú y mới |
| **VeterinaryRecord** | `PUT` | `/api/v1/veterinary/records/{id}` | - | Cập nhật bệnh án thú y |
| **Vaccination** | `GET` | `/api/v1/veterinary/vaccinations` |  | Danh sách lịch tiêm phòng |
| **Vaccination** | `POST` | `/api/v1/veterinary/vaccinations` | - | Tạo lịch tiêm phòng mới |
| **Vaccination** | `PUT` | `/api/v1/veterinary/vaccinations/{id}` | - | Cập nhật lịch tiêm phòng |
| **AIAnalysisSession** | `POST` | `/api/v1/ai/analyze` | - | Phân tích video AI tự động |
| **AIAnalysisSession** | `GET` | `/api/v1/ai/sessions` |  | Danh sách phiên phân tích AI |
| **AIAnalysisSession** | `POST` | `/api/v1/ai/sessions` | - | Tạo phiên phân tích AI mới |
| **AIAnalysisSession** | `GET` | `/api/v1/ai/sessions/{id}` | - | Chi tiết phiên phân tích AI |
| **AIDetectionResult** | `GET` | `/api/v1/ai/sessions/{id}/detections` | - | Chi tiết tọa độ/hành vi theo phiên |
| **AIDetectionResult** | `POST` | `/api/v1/ai/sessions/{id}/detections` | - | Đẩy kết quả nhận diện theo phiên |
| **AIDetectionResult** | `GET` | `/api/v1/ai/detections` |  | Danh sách toàn bộ kết quả nhận diện |
| **AIAlert** | `GET` | `/api/v1/ai/alerts` |  | Danh sách cảnh báo AI |
| **AIAlert** | `PUT` | `/api/v1/ai/alerts/{id}/status` | - | Cập nhật trạng thái cảnh báo |
| **Notification** | `GET` | `/api/v1/notifications` |  | Danh sách thông báo người dùng |
| **Notification** | `GET` | `/api/v1/notifications/unread-count` | - | Đếm số thông báo chưa đọc |
| **Notification** | `PUT` | `/api/v1/notifications/{id}/read` | - | Đánh dấu thông báo đã đọc |
| **System** | `GET` | `/api/v1/health` | - | Kiểm tra trạng thái kết nối Cloud DB |

