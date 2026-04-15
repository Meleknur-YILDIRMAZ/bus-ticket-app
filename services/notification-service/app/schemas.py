from pydantic import BaseModel
from typing import Optional


class NotificationCreate(BaseModel):
    recipient_email: str
    recipient_phone: Optional[str] = None
    subject: str
    body: str
    notification_type: str = "email"
    booking_ref: Optional[str] = None


class NotificationResponse(BaseModel):
    id: int
    status: str
    message: str
