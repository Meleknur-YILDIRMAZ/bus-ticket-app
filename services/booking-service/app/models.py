from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text
from sqlalchemy.sql import func
from .database import Base


class Booking(Base):
    """Rezervasyon kaydı."""
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_ref = Column(String(20), unique=True, index=True)  # BK-XXXXXXXX
    user_id = Column(Integer, nullable=True)
    trip_id = Column(String(100), nullable=False)
    trip_type = Column(String(10), nullable=False)             # bus / flight
    seat_number = Column(String(10), nullable=False)
    passenger_name = Column(String(100), nullable=False)
    passenger_tc = Column(String(11), nullable=False)
    passenger_gender = Column(String(10), nullable=False)
    passenger_phone = Column(String(11), nullable=False)
    passenger_email = Column(String(100), nullable=False)
    total_price = Column(Float, nullable=False)
    status = Column(String(20), default="pending")             # pending/confirmed/cancelled
    payment_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)


class SeatLock(Base):
    """Koltuk kilitleme (15 dakika TTL)."""
    __tablename__ = "seat_locks"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(String(100), nullable=False)
    seat_number = Column(String(10), nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=False)
