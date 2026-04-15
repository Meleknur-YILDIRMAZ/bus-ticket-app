from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from .database import Base


class UserProfile(Base):
    """Kullanıcı profil bilgisi (auth-service'den bağımsız okuma için)."""
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    auth_user_id = Column(Integer, unique=True, index=True)    # auth-service'deki user.id
    email = Column(String(100), unique=True, index=True)
    full_name = Column(String(100), nullable=False)
    tc_no = Column(String(11), nullable=True)
    phone = Column(String(11), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)
