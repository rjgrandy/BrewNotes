import uuid
from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Bean(Base):
    __tablename__ = "beans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    roaster: Mapped[str | None] = mapped_column(String, nullable=True)
    origin: Mapped[str | None] = mapped_column(String, nullable=True)
    process: Mapped[str | None] = mapped_column(String, nullable=True)
    roast_level: Mapped[str | None] = mapped_column(String, nullable=True)
    tasting_notes: Mapped[str | None] = mapped_column(String, nullable=True)
    roast_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    open_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    bag_size_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    decaf: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_path: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_path: Mapped[str | None] = mapped_column(String, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    current_best_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    drinks: Mapped[list["DrinkLog"]] = relationship("DrinkLog", back_populates="bean")


class DrinkLog(Base):
    __tablename__ = "drink_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    bean_id: Mapped[str] = mapped_column(String, ForeignKey("beans.id"), nullable=False)
    drink_type: Mapped[str] = mapped_column(String, nullable=False)
    custom_label: Mapped[str | None] = mapped_column(String, nullable=True)

    made_by: Mapped[str | None] = mapped_column(String, nullable=True)
    rated_by: Mapped[str | None] = mapped_column(String, nullable=True)

    temperature_level: Mapped[str] = mapped_column(String, nullable=False)
    body_level: Mapped[str] = mapped_column(String, nullable=False)
    order: Mapped[str] = mapped_column(String, nullable=False)
    coffee_volume_ml: Mapped[float] = mapped_column(Float, nullable=False)
    milk_volume_ml: Mapped[float] = mapped_column(Float, nullable=False)
    strength_level: Mapped[str] = mapped_column(String, nullable=False)
    grind_setting: Mapped[int] = mapped_column(Integer, nullable=False)

    overall_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    sweetness: Mapped[int] = mapped_column(Integer, nullable=False)
    bitterness: Mapped[int] = mapped_column(Integer, nullable=False)
    acidity: Mapped[int] = mapped_column(Integer, nullable=False)
    body_mouthfeel: Mapped[int] = mapped_column(Integer, nullable=False)
    balance: Mapped[int] = mapped_column(Integer, nullable=False)
    would_make_again: Mapped[bool] = mapped_column(Boolean, default=False)
    dialed_in: Mapped[bool] = mapped_column(Boolean, default=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_path: Mapped[str | None] = mapped_column(String, nullable=True)

    bean: Mapped[Bean] = relationship("Bean", back_populates="drinks")
