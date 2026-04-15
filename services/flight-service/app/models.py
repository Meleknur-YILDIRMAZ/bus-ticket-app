from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Numeric
from sqlalchemy.sql import func
from .database import Base


class Airport(Base):
    """Havalimanı — prompt'taki CREATE TABLE airports'a karşılık gelir."""
    __tablename__ = "airports"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(3), unique=True, index=True)    # IST, SAW vb.
    city = Column(String(100), nullable=False)
    name = Column(String(200), nullable=False)
    region = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)


class Airline(Base):
    """Havayolu — prompt'taki CREATE TABLE airlines'a karşılık gelir."""
    __tablename__ = "airlines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(3))                              # THY, PGS, AJT, XQ
    name = Column(String(100), nullable=False)
    logo_url = Column(String(500), nullable=True)
    airline_type = Column(String(20), default="full_service")  # full_service / low_cost


class Flight(Base):
    """Uçuş — prompt'taki CREATE TABLE flights'a karşılık gelir."""
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True)
    flight_number = Column(String(20), nullable=False)
    airline_id = Column(Integer, nullable=False)
    from_airport = Column(String(3), nullable=False)
    to_airport = Column(String(3), nullable=False)
    departure_time = Column(String(20), nullable=False)
    arrival_time = Column(String(20), nullable=False)
    aircraft_type = Column(String(50), nullable=True)    # Boeing 737, Airbus A320
    economy_price = Column(Numeric(10, 2), nullable=False)
    business_price = Column(Numeric(10, 2), nullable=True)
    baggage_allowance = Column(Integer, default=20)      # kg
    meal_included = Column(Boolean, default=False)
    status = Column(String(20), default="scheduled")     # scheduled/cancelled/delayed
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FlightSeat(Base):
    """Uçak koltuğu — prompt'taki CREATE TABLE flight_seats'e karşılık gelir."""
    __tablename__ = "flight_seats"

    id = Column(Integer, primary_key=True, index=True)
    flight_id = Column(Integer, nullable=False, index=True)
    seat_number = Column(String(10), nullable=False)     # 12A, 12B vb.
    seat_class = Column(String(20), default="economy")   # economy / business
    is_available = Column(Boolean, default=True)
    extra_legroom = Column(Boolean, default=False)
    price_multiplier = Column(Float, default=1.00)
