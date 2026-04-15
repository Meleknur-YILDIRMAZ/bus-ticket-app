from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text
from sqlalchemy.sql import func
from .database import Base


class BusTrip(Base):
    """Otobüs seferi modeli."""
    __tablename__ = "bus_trips"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(100), nullable=False)          # Pamukkale, Metro vb.
    bus_type = Column(String(20), nullable=False)          # 2+1, 2+2
    from_city = Column(String(100), nullable=False)
    to_city = Column(String(100), nullable=False)
    departure_time = Column(String(20), nullable=False)    # HH:MM
    arrival_time = Column(String(20), nullable=False)
    duration = Column(String(20), nullable=False)          # "5s 30dk"
    price = Column(Float, nullable=False)
    available_seats = Column(Integer, default=40)
    features = Column(Text, nullable=True)                 # WiFi, USB, vb.
    has_wifi = Column(Boolean, default=False)
    has_usb = Column(Boolean, default=False)
    has_personal_screen = Column(Boolean, default=False)
    has_toilet = Column(Boolean, default=True)
    meal_service = Column(Boolean, default=False)
    baggage_kg = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    trip_date = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BusSeat(Base):
    """Otobüs koltuğu modeli."""
    __tablename__ = "bus_seats"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, nullable=False, index=True)
    seat_number = Column(String(10), nullable=False)       # 1A, 1B, 2A vb.
    is_available = Column(Boolean, default=True)
    gender = Column(String(10), nullable=True)             # female, male, None
    price_multiplier = Column(Float, default=1.0)
