import asyncio
import random
from datetime import date, datetime, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, init_db
from app.core.security import get_password_hash
from app.models.models import (
    User, UserRole, Barn, Flock, FlockStatus, ProductionRecord,
    InventoryCategory, InventoryItem, InventoryTransaction, InventoryTransactionType,
    Disease, VeterinaryRecord, VetRecordStatus, Vaccination, VaccinationStatus,
    AIAnalysisSession, AIDetectionResult, AIAlert, AIAlertSeverity, AIAlertStatus,
    Camera, Notification
)

async def seed():
    print("[INFO] Starting database seed script for DuckCare AI...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # Check if users exist
        res = await db.execute(select(User).where(User.username == "admin"))
        if res.scalars().first():
            # Check if cameras exist
            cam_res = await db.execute(select(Camera))
            if not cam_res.scalars().first():
                # Get existing barns & users
                barns_res = await db.execute(select(Barn))
                barns = barns_res.scalars().all()
                users_res = await db.execute(select(User))
                users = users_res.scalars().all()
                if barns:
                    cameras = [
                        Camera(name="Cam 01 - Góc Úm A1 (HD)", barn_id=barns[0].id, status="ONLINE", rtsp_url="rtsp://192.168.1.101:554/stream1"),
                        Camera(name="Cam 02 - Góc Hồ Tắm B1", barn_id=barns[1].id, status="ONLINE", rtsp_url="rtsp://192.168.1.102:554/stream1"),
                        Camera(name="Cam 03 - Máng Đẻ C1", barn_id=barns[2].id, status="ONLINE", rtsp_url="rtsp://192.168.1.103:554/stream1"),
                        Camera(name="Cam 04 - Khu Cách Ly D1", barn_id=barns[3].id, status="OFFLINE", rtsp_url="rtsp://192.168.1.104:554/stream1")
                    ]
                    db.add_all(cameras)
                    notifications = [
                        Notification(user_id=users[0].id, title="Cảnh báo AI Nhận diện", message="Phát hiện 2 cá thể vịt ủ rũ tại Chuồng Thịt B1", is_read=False, created_at=datetime.utcnow() - timedelta(minutes=30)),
                        Notification(user_id=users[0].id, title="Cảnh báo Tồn kho", message="Vắc xin H5N1 giảm xuống dưới mức tối thiểu (800 liều)", is_read=False, created_at=datetime.utcnow() - timedelta(hours=3)),
                        Notification(user_id=users[0].id, title="Nhắc lịch tiêm phòng", message="Đàn Vịt Trời FL-2026-01 có lịch tiêm vắc xin H5N1 sau 3 ngày", is_read=True, created_at=datetime.utcnow() - timedelta(hours=12))
                    ]
                    db.add_all(notifications)
                    await db.commit()
                    print("[OK] Seeded new cameras and notifications!")
            print("[INFO] Seed data verified.")
            return

        # 1. Users
        users = [
            User(
                username="admin",
                email="admin@duckcare.ai",
                hashed_password=get_password_hash("password123"),
                full_name="Nguyễn Văn Quản Trị",
                role=UserRole.ADMIN,
                is_active=True
            ),
            User(
                username="manager",
                email="manager@duckcare.ai",
                hashed_password=get_password_hash("password123"),
                full_name="Trần Thị Quản Lý",
                role=UserRole.FARM_MANAGER,
                is_active=True
            ),
            User(
                username="vet",
                email="vet@duckcare.ai",
                hashed_password=get_password_hash("password123"),
                full_name="BS. Lê Hoàng Thú Y",
                role=UserRole.VETERINARIAN,
                is_active=True
            ),
            User(
                username="staff",
                email="staff@duckcare.ai",
                hashed_password=get_password_hash("password123"),
                full_name="Phạm Văn Nhân Viên",
                role=UserRole.STAFF,
                is_active=True
            )
        ]
        db.add_all(users)
        await db.commit()
        print("[OK] Created 4 users (admin, manager, vet, staff)")

        # 2. Barns
        barns = [
            Barn(code="CH-01", name="Chuồng Úm A1", capacity=3000, current_occupancy=2500, status="ACTIVE", description="Chuồng úm công nghệ cao giữ nhiệt tự động"),
            Barn(code="CH-02", name="Chuồng Thịt B1", capacity=5000, current_occupancy=4200, status="ACTIVE", description="Chuồng nuôi thịt có hồ tắm tuần hoàn"),
            Barn(code="CH-03", name="Chuồng Đẻ C1", capacity=4000, current_occupancy=3800, status="ACTIVE", description="Chuồng sinh sản thu trứng bán tự động"),
            Barn(code="CH-04", name="Chuồng Cách Ly D1", capacity=500, current_occupancy=50, status="ACTIVE", description="Khu vực theo dõi và điều trị thú y đặc biệt")
        ]
        db.add_all(barns)
        await db.commit()
        print("[OK] Created 4 barns")

        # 3. Flocks
        flocks = [
            Flock(
                code="FL-2026-01",
                name="Đàn Vịt Trời Giống F1 - Đợt 1",
                barn_id=barns[0].id,
                initial_quantity=2600,
                current_quantity=2500,
                age_weeks=3,
                status=FlockStatus.BROODING,
                entry_date=date.today() - timedelta(days=21),
                description="Đàn vịt giống F1 chủng thuần thích nghi cao"
            ),
            Flock(
                code="FL-2026-02",
                name="Đàn Vịt Thương Phẩm B1",
                barn_id=barns[1].id,
                initial_quantity=4300,
                current_quantity=4200,
                age_weeks=12,
                status=FlockStatus.GROWING,
                entry_date=date.today() - timedelta(days=84),
                description="Đàn nuôi thương phẩm phục vụ nhà hàng"
            ),
            Flock(
                code="FL-2026-03",
                name="Đàn Vịt Sinh Sản C1",
                barn_id=barns[2].id,
                initial_quantity=3900,
                current_quantity=3800,
                age_weeks=28,
                status=FlockStatus.LAYING,
                entry_date=date.today() - timedelta(days=196),
                description="Đàn vịt đẻ trứng giống chất lượng cao"
            ),
            Flock(
                code="FL-2026-04",
                name="Đàn Theo Dõi Thú Y D1",
                barn_id=barns[3].id,
                initial_quantity=50,
                current_quantity=50,
                age_weeks=10,
                status=FlockStatus.GROWING,
                entry_date=date.today() - timedelta(days=7),
                description="Cá thể đang điều trị triệu chứng ủ rũ"
            )
        ]
        db.add_all(flocks)
        await db.commit()
        print("[OK] Created 4 flocks")

        # 4. Production Records (past 30 days)
        prod_records = []
        for d_offset in range(30, -1, -1):
            rec_date = date.today() - timedelta(days=d_offset)
            # Flock 3 (Laying eggs)
            eggs = random.randint(2900, 3400)
            mortality = 1 if random.random() < 0.2 else 0
            feed = round(random.uniform(420.0, 460.0), 1)
            prod_records.append(ProductionRecord(
                flock_id=flocks[2].id,
                record_date=rec_date,
                eggs_collected=eggs,
                mortality_count=mortality,
                feed_consumed_kg=feed,
                weight_avg_gram=1650.0 + (30 - d_offset) * 5,
                notes="Sản lượng trứng ổn định" if mortality == 0 else "Hao hụt 1 con do va quệt"
            ))
            # Flock 2 (Growing)
            feed_g = round(random.uniform(500.0, 550.0), 1)
            mort_g = 1 if random.random() < 0.15 else 0
            prod_records.append(ProductionRecord(
                flock_id=flocks[1].id,
                record_date=rec_date,
                eggs_collected=0,
                mortality_count=mort_g,
                feed_consumed_kg=feed_g,
                weight_avg_gram=1400.0 + (30 - d_offset) * 15,
                notes="Tăng trọng tốt"
            ))
        db.add_all(prod_records)
        await db.commit()
        print("[OK] Created 60+ daily production records")

        # 5. Inventory Categories & Items
        cat_feed = InventoryCategory(name="Thức ăn & Cám", description="Các loại thức ăn hỗn hợp và phụ gia dinh dưỡng")
        cat_med = InventoryCategory(name="Thuốc & Vắc xin", description="Vắc xin phòng bệnh và kháng sinh thú y")
        cat_equip = InventoryCategory(name="Vật tư & Thiết bị", description="Máng ăn, máng uống, máng đẻ và đèn sưởi")
        db.add_all([cat_feed, cat_med, cat_equip])
        await db.commit()

        items = [
            InventoryItem(category_id=cat_feed.id, code="TA-01", name="Cám Úm Vịt Con GreenFeed", unit="bao (40kg)", min_quantity=50.0, current_quantity=120.0, cost_per_unit=380000.0),
            InventoryItem(category_id=cat_feed.id, code="TA-02", name="Cám Vịt Đẻ Hỗn Hợp DeHeus", unit="bao (40kg)", min_quantity=100.0, current_quantity=85.0, cost_per_unit=410000.0, notes="Sắp xuống dưới ngưỡng tối thiểu"),
            InventoryItem(category_id=cat_med.id, code="VX-01", name="Vắc xin Dịch tả Vịt (Duck Plague)", unit="liều", min_quantity=1000.0, current_quantity=5000.0, expiry_date=date.today() + timedelta(days=180), cost_per_unit=250.0),
            InventoryItem(category_id=cat_med.id, code="VX-02", name="Vắc xin Cúm Gia Cầm H5N1 Re-6", unit="liều", min_quantity=2000.0, current_quantity=800.0, expiry_date=date.today() + timedelta(days=45), cost_per_unit=350.0, notes="[ALERT] Cảnh báo tồn kho thấp!"),
            InventoryItem(category_id=cat_med.id, code="TH-01", name="Kháng sinh Amoxicillin 50%", unit="hộp (1kg)", min_quantity=10.0, current_quantity=25.0, expiry_date=date.today() + timedelta(days=300), cost_per_unit=650000.0),
            InventoryItem(category_id=cat_equip.id, code="TB-01", name="Bóng Đèn Hồng Ngoại Sưởi Úm 175W", unit="cái", min_quantity=15.0, current_quantity=30.0, cost_per_unit=85000.0)
        ]
        db.add_all(items)
        await db.commit()

        # Add transactions
        txs = [
            InventoryTransaction(item_id=items[0].id, transaction_type=InventoryTransactionType.IMPORT, quantity=150.0, performed_by="Phạm Văn Nhân Viên", notes="Nhập kho định kỳ đầu tháng"),
            InventoryTransaction(item_id=items[0].id, transaction_type=InventoryTransactionType.EXPORT, quantity=30.0, performed_by="Phạm Văn Nhân Viên", notes="Xuất cho Chuồng Úm A1"),
            InventoryTransaction(item_id=items[3].id, transaction_type=InventoryTransactionType.IMPORT, quantity=1000.0, performed_by="BS. Lê Hoàng Thú Y", notes="Nhập bổ sung đợt tiêm phòng H5N1")
        ]
        db.add_all(txs)
        await db.commit()
        print("[OK] Created inventory categories, items, and transactions")

        # 6. Diseases
        diseases = [
            Disease(code="BENH-01", name="Dịch tả vịt (Duck Plague)", symptoms="Sốt cao, đầu sưng, sệ cánh, chảy nước mắt, tiêu chảy phân xanh vàng", treatment="Tiêm vắc xin can thiệp ổ dịch + Bổ sung Vitamin C và điện giải", severity="CRITICAL"),
            Disease(code="BENH-02", name="Tụ huyết trùng (Pasteurellosis)", symptoms="Vịt chết đột ngột, sốt, khó thở, chảy nhớt ở mỏ, khớp sưng", treatment="Tiêm Kháng sinh Amoxicillin hoặc Penicillin + Streptomycin 3-5 ngày", severity="HIGH"),
            Disease(code="BENH-03", name="Viêm gan do virus (Duck Hepatitis)", symptoms="Vịt con co giật, đầu ngoái về sau (ngửa cổ), co giật chân", treatment="Tiêm kháng thể kháng viêm gan vịt ngay lập tức", severity="CRITICAL"),
            Disease(code="BENH-04", name="Nhiễm trùng huyết do Riemerella anatipestifer", symptoms="Vịt sệ đít, đi đứng xiêu vẹo, lắc đầu, mắt có màng đục", treatment="Dùng Ceftiofur hoặc Florfenicol phối hợp men tiêu hóa", severity="HIGH")
        ]
        db.add_all(diseases)
        await db.commit()

        # Vet records & Vaccinations
        vet_recs = [
            VeterinaryRecord(
                flock_id=flocks[3].id,
                disease_id=diseases[3].id,
                diagnosis_date=date.today() - timedelta(days=3),
                status=VetRecordStatus.TREATING,
                affected_count=5,
                treatment_plan="Cách ly đàn 50 con tại Chuồng D1, tiêm Ceftiofur 2mg/kg thể trọng, cho uống B-complex",
                veterinarian_name="BS. Lê Hoàng Thú Y",
                notes="Phát hiện sớm qua hệ thống AI nhận diện hành vi ủ rũ"
            )
        ]
        db.add_all(vet_recs)

        vaccinations = [
            Vaccination(
                flock_id=flocks[0].id,
                vaccine_name="Vắc xin Dịch tả Vịt Lần 1",
                scheduled_date=date.today() - timedelta(days=7),
                administered_date=date.today() - timedelta(days=7),
                status=VaccinationStatus.COMPLETED,
                dosage="0.5 ml/con",
                notes="Tiêm phòng thành công 2,500 con"
            ),
            Vaccination(
                flock_id=flocks[0].id,
                vaccine_name="Vắc xin Cúm Gia Cầm H5N1",
                scheduled_date=date.today() + timedelta(days=3),
                status=VaccinationStatus.SCHEDULED,
                dosage="0.5 ml/con",
                notes="Chuẩn bị vật tư vắc xin tại kho"
            ),
            Vaccination(
                flock_id=flocks[1].id,
                vaccine_name="Vắc xin Viêm gan Vịt Nhắc lại",
                scheduled_date=date.today() + timedelta(days=10),
                status=VaccinationStatus.SCHEDULED,
                dosage="1.0 ml/con",
                notes="Lịch tiêm phòng định kỳ"
            )
        ]
        db.add_all(vaccinations)
        await db.commit()
        print("[OK] Created diseases, vet records, and vaccinations")

        # 7. AI Analysis Sessions & Alerts
        ai_sess = AIAnalysisSession(
            flock_id=flocks[1].id,
            barn_id=barns[1].id,
            session_date=datetime.utcnow() - timedelta(hours=2),
            video_filename="sample_duck_flock_01.mp4",
            duration_seconds=15.0,
            total_ducks_detected=12,
            abnormal_count=2,
            status="COMPLETED"
        )
        db.add(ai_sess)
        await db.commit()
        await db.refresh(ai_sess)

        ai_alerts = [
            AIAlert(
                session_id=ai_sess.id,
                flock_id=flocks[1].id,
                alert_type="LETHARGY_DETECTED",
                severity=AIAlertSeverity.WARNING,
                message="Phát hiện 2 cá thể vịt có hành vi ủ rũ & di chuyển chậm bất thường tại Chuồng Thịt B1.",
                timestamp=datetime.utcnow() - timedelta(hours=2),
                status=AIAlertStatus.NEW
            ),
            AIAlert(
                session_id=None,
                flock_id=flocks[3].id,
                alert_type="ISOLATION_ALERT",
                severity=AIAlertSeverity.HIGH,
                message="Cảnh báo cá thể vịt đứng tách đàn kéo dài trên 10 phút tại Chuồng Cách Ly D1.",
                timestamp=datetime.utcnow() - timedelta(hours=14),
                status=AIAlertStatus.ACKNOWLEDGED
            )
        ]
        db.add_all(ai_alerts)
        await db.commit()

        # 8. Cameras
        cameras = [
            Camera(name="Cam 01 - Góc Úm A1 (HD)", barn_id=barns[0].id, status="ONLINE", rtsp_url="rtsp://192.168.1.101:554/stream1"),
            Camera(name="Cam 02 - Góc Hồ Tắm B1", barn_id=barns[1].id, status="ONLINE", rtsp_url="rtsp://192.168.1.102:554/stream1"),
            Camera(name="Cam 03 - Máng Đẻ C1", barn_id=barns[2].id, status="ONLINE", rtsp_url="rtsp://192.168.1.103:554/stream1"),
            Camera(name="Cam 04 - Khu Cách Ly D1", barn_id=barns[3].id, status="OFFLINE", rtsp_url="rtsp://192.168.1.104:554/stream1")
        ]
        db.add_all(cameras)

        # 9. Notifications
        notifications = [
            Notification(user_id=users[0].id, title="Cảnh báo AI Nhận diện", message="Phát hiện 2 cá thể vịt ủ rũ tại Chuồng Thịt B1", is_read=False, created_at=datetime.utcnow() - timedelta(minutes=30)),
            Notification(user_id=users[0].id, title="Cảnh báo Tồn kho", message="Vắc xin H5N1 giảm xuống dưới mức tối thiểu (800 liều)", is_read=False, created_at=datetime.utcnow() - timedelta(hours=3)),
            Notification(user_id=users[0].id, title="Nhắc lịch tiêm phòng", message="Đàn Vịt Trời FL-2026-01 có lịch tiêm vắc xin H5N1 sau 3 ngày", is_read=True, created_at=datetime.utcnow() - timedelta(hours=12))
        ]
        db.add_all(notifications)
        await db.commit()
        print("[OK] Created sample cameras and notifications")

    print("[SUCCESS] Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
