from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from .database import Base


class Notification(Base):
    """Bildirim kaydı."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(100), nullable=False)
    recipient_phone = Column(String(11), nullable=True)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    notification_type = Column(String(20), default="email")    # email / sms
    status = Column(String(20), default="sent")                # sent / failed
    booking_ref = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
