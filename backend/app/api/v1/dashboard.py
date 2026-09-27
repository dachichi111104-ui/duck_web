from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta
from app.core.database import get_db
from app.models.models import Flock, Barn, ProductionRecord, AIAlert, InventoryItem, Vaccination, AIAlertStatus, VaccinationStatus
from app.schemas.schemas import DashboardStats, AIAlertOut
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", response_model=DashboardStats)
@router.get("/", response_model=DashboardStats)
@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Total flocks & total ducks
    flocks_res = await db.execute(select(func.count(Flock.id), func.coalesce(func.sum(Flock.current_quantity), 0)))
    total_flocks, total_ducks = flocks_res.first()

    # Total barns
    barns_res = await db.execute(select(func.count(Barn.id)))
    total_barns = barns_res.scalar() or 0

    # Today's production records
    today = date.today()
    prod_res = await db.execute(
        select(
            func.coalesce(func.sum(ProductionRecord.eggs_collected), 0),
            func.coalesce(func.sum(ProductionRecord.mortality_count), 0)
        ).where(ProductionRecord.record_date == today)
    )
    today_eggs, today_mortality = prod_res.first()

    # Active alerts count
    alerts_res = await db.execute(
        select(func.count(AIAlert.id)).where(AIAlert.status != AIAlertStatus.RESOLVED)
    )
    active_alerts_count = alerts_res.scalar() or 0

    # Low stock items count
    inventory_res = await db.execute(
        select(func.count(InventoryItem.id)).where(InventoryItem.current_quantity <= InventoryItem.min_quantity)
    )
    low_stock_items_count = inventory_res.scalar() or 0

    # Upcoming vaccinations
    next_week = today + timedelta(days=7)
    vac_res = await db.execute(
        select(func.count(Vaccination.id)).where(
            Vaccination.status == VaccinationStatus.SCHEDULED,
            Vaccination.scheduled_date <= next_week
        )
    )
    upcoming_vaccinations_count = vac_res.scalar() or 0

    return DashboardStats(
        total_flocks=total_flocks,
        total_ducks=total_ducks,
        total_barns=total_barns,
        today_eggs=today_eggs,
        today_mortality=today_mortality,
        active_alerts_count=active_alerts_count,
        low_stock_items_count=low_stock_items_count,
        upcoming_vaccinations_count=upcoming_vaccinations_count
    )

@router.get("/charts")
async def get_dashboard_charts(
    days: int = 14,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    result = await db.execute(
        select(
            ProductionRecord.record_date,
            func.sum(ProductionRecord.eggs_collected).label("eggs"),
            func.sum(ProductionRecord.mortality_count).label("mortality"),
            func.sum(ProductionRecord.feed_consumed_kg).label("feed")
        )
        .where(ProductionRecord.record_date >= start_date)
        .group_by(ProductionRecord.record_date)
        .order_by(ProductionRecord.record_date.asc())
    )
    
    rows = result.all()
    # Map by date string
    record_map = {r.record_date.strftime("%Y-%m-%d"): r for r in rows}
    
    chart_data = []
    curr = start_date
    while curr <= end_date:
        ds = curr.strftime("%Y-%m-%d")
        r = record_map.get(ds)
        chart_data.append({
            "date": ds,
            "eggs": int(r.eggs) if r and r.eggs else 0,
            "mortality": int(r.mortality) if r and r.mortality else 0,
            "feed": float(r.feed) if r and r.feed else 0.0
        })
        curr += timedelta(days=1)
        
    return chart_data
