from pydantic import BaseModel
from typing import Optional


class AirportSchema(BaseModel):
    code: str
    city: str
    name: str
    region: Optional[str] = None

    class Config:
        from_attributes = True


class FlightSchema(BaseModel):
    id: str
    flight_number: str
    airline: str
    airline_code: str
    from_airport: str
    to_airport: str
    departure_time: str
    arrival_time: str
    duration: str
    stops: int = 0
    aircraft_type: str
    economy_price: float
    business_price: Optional[float] = None
    price: float                    # aktif sınıf fiyatı
    baggage: int
    meal_included: bool

    class Config:
        from_attributes = True


class FlightSeatSchema(BaseModel):
    id: int
    flight_id: str
    seat_number: str
    seat_class: str
    is_available: bool
    extra_legroom: bool
    price_multiplier: float

    class Config:
        from_attributes = True
