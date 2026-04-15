from pydantic import BaseModel
from typing import Optional


class PaymentRequest(BaseModel):
    trip_id: str
    trip_type: str
    seats: list
    passengers: list
    payment: dict


class PaymentResponse(BaseModel):
    status: str
    payment_id: str
    booking_ref: str
    message: str
