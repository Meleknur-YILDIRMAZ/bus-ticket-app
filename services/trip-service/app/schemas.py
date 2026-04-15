from pydantic import BaseModel
from typing import Optional, List


class BusSeatSchema(BaseModel):
    id: int
    trip_id: int
    seat_number: str
    is_available: bool
    gender: Optional[str] = None
    price_multiplier: float = 1.0

    class Config:
        from_attributes = True


class BusTripSchema(BaseModel):
    id: int
    company: str
    bus_type: str
    from_city: str
    to_city: str
    departure_time: str
    arrival_time: str
    duration: str
    price: float
    available_seats: int
    features: Optional[str] = None
    has_wifi: bool = False
    has_usb: bool = False
    has_personal_screen: bool = False
    has_toilet: bool = True
    meal_service: bool = False
    baggage_kg: int = 30

    class Config:
        from_attributes = True
