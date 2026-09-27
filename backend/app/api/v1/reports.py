import io
import pandas as pd
from typing import Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import ProductionRecord, Flock, VeterinaryRecord, AIAlert
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/summary")
async def get_report_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    flock_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    query = select(
        ProductionRecord.record_date,
        ProductionRecord.flock_id,
        ProductionRecord.eggs_collected,
        ProductionRecord.mortality_count,
        ProductionRecord.feed_consumed_kg,
        ProductionRecord.weight_avg_gram,
        Flock.name.label("flock_name")
    ).join(Flock, ProductionRecord.flock_id == Flock.id)\
     .where(ProductionRecord.record_date >= start_date, ProductionRecord.record_date <= end_date)

    if flock_id:
        query = query.where(ProductionRecord.flock_id == flock_id)

    query = query.order_by(ProductionRecord.record_date.asc())
    res = await db.execute(query)
    rows = res.all()

    total_eggs = sum(r.eggs_collected for r in rows)
    total_mortality = sum(r.mortality_count for r in rows)
    total_feed = sum(r.feed_consumed_kg for r in rows)
    avg_fcr = round(total_feed / (total_eggs * 0.065) if total_eggs > 0 else 0, 2)

    records_list = [
        {
            "record_date": r.record_date.strftime("%Y-%m-%d"),
            "flock_id": r.flock_id,
            "flock_name": r.flock_name,
            "eggs_collected": r.eggs_collected,
            "mortality_count": r.mortality_count,
            "feed_consumed_kg": r.feed_consumed_kg,
            "weight_avg_gram": r.weight_avg_gram
        } for r in rows
    ]

    return {
        "period": {"start_date": start_date, "end_date": end_date},
        "totals": {
            "total_eggs": total_eggs,
            "total_mortality": total_mortality,
            "total_feed_kg": round(total_feed, 1),
            "estimated_fcr": avg_fcr
        },
        "records": records_list
    }

@router.get("/export/excel")
async def export_report_excel(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    flock_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    query = select(
        ProductionRecord.record_date,
        Flock.name.label("Tên Đàn"),
        Flock.code.label("Mã Đàn"),
        ProductionRecord.eggs_collected.label("Số Trứng Thu (Quả)"),
        ProductionRecord.mortality_count.label("Số Vịt Chết (Con)"),
        ProductionRecord.feed_consumed_kg.label("Thức Ăn (Kg)"),
        ProductionRecord.weight_avg_gram.label("Trọng Lượng TB (g)")
    ).join(Flock, ProductionRecord.flock_id == Flock.id)\
     .where(ProductionRecord.record_date >= start_date, ProductionRecord.record_date <= end_date)

    if flock_id:
        query = query.where(ProductionRecord.flock_id == flock_id)

    query = query.order_by(ProductionRecord.record_date.asc())
    res = await db.execute(query)
    rows = res.mappings().all()

    df = pd.DataFrame(rows)
    if df.empty:
        df = pd.DataFrame(columns=["record_date", "Tên Đàn", "Mã Đàn", "Số Trứng Thu (Quả)", "Số Vịt Chết (Con)", "Thức Ăn (Kg)", "Trọng Lượng TB (g)"])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Báo cáo Sản lượng")

    output.seek(0)
    filename = f"Bao_Cao_San_Luong_{start_date}_den_{end_date}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
