from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import DrinkLog

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("")
def global_analytics(db: Session = Depends(get_db)) -> dict:
    total_drinks = db.query(func.count(DrinkLog.id)).scalar() or 0
    avg_rating = db.query(func.avg(DrinkLog.overall_rating)).scalar() or 0
    recent_drinks = (
        db.query(DrinkLog)
        .order_by(DrinkLog.created_at.desc())
        .limit(10)
        .all()
    )
    hall_of_fame = (
        db.query(DrinkLog)
        .filter(DrinkLog.created_at >= func.datetime("now", "-30 days"))
        .order_by(DrinkLog.overall_rating.desc())
        .limit(5)
        .all()
    )
    return {
        "total_drinks": total_drinks,
        "average_rating": float(avg_rating),
        "recent_drinks": [drink.id for drink in recent_drinks],
        "hall_of_fame": [drink.id for drink in hall_of_fame],
    }
