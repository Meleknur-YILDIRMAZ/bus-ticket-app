from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import re


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    tc_no: Optional[str] = Field(None, min_length=11, max_length=11)  # Opsiyonel
    phone: str = Field(..., min_length=11, max_length=11)

    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        if not re.match(r'^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$', v):
            raise ValueError('Ad soyad sadece harf içermeli')
        return v.strip()

    @field_validator('tc_no')
    @classmethod
    def validate_tc_no(cls, v):
        if v is None:
            return v
        if not re.match(r'^\d{11}$', v):
            raise ValueError('TC Kimlik No 11 haneli rakam olmalı')
        return v

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if not re.match(r'^\d{11}$', v):
            raise ValueError('Telefon 11 haneli rakam olmalı')
        if not v.startswith('05'):
            raise ValueError("Telefon '05' ile başlamalı")
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not re.match(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+{};:,<.>/?\\[\]|~`])',
            v
        ):
            raise ValueError(
                'Şifre: min 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam, 1 özel karakter'
            )
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    tc_no: Optional[str] = None
    phone: str
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str