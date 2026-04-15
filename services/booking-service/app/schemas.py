from pydantic import BaseModel
from typing import Optional


class BookingCreate(BaseModel):
    trip_id: str
    trip_type: str
    seat_number: str
    passenger_name: str
    passenger_tc: str
    passenger_gender: str
    passenger_phone: str
    passenger_email: str
    total_price: float


class BookingResponse(BaseModel):
    id: int
    booking_ref: str
    trip_id: str
    trip_type: str
    seat_number: str
    passenger_name: str
    status: str
    total_price: float

    class Config:
        from_attributes = True
