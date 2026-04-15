from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.sql import func
from .database import Base


class Payment(Base):
    """Ödeme kaydı."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(50), unique=True, index=True)   # PAY-XXXXXXXX
    booking_ref = Column(String(20), nullable=False)
    amount = Column(Float, nullable=False)
    card_last4 = Column(String(4), nullable=False)
    card_name = Column(String(100), nullable=False)
    status = Column(String(20), default="pending")             # pending/success/failed
    three_d_passed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
