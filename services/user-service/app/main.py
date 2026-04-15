"""
User Service — Profil yönetimi, geçmiş rezervasyonlar.

Port: 8002 (nginx: /api/user/)
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .database import SessionLocal, engine, Base
from . import models, schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="User Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "user"}


@app.get("/profile/{user_id}", response_model=schemas.UserProfileResponse)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    """Kullanıcı profil bilgisini getir."""
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.auth_user_id == user_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    return profile


@app.post("/profile/create", response_model=schemas.UserProfileResponse)
def create_profile(
    auth_user_id: int,
    email: str,
    full_name: str,
    tc_no: str = None,
    phone: str = None,
    db: Session = Depends(get_db),
):
    """Yeni kullanıcı profili oluştur (auth-service kayıt sonrası tetiklenir)."""
    existing = db.query(models.UserProfile).filter(
        models.UserProfile.auth_user_id == auth_user_id
    ).first()
    if existing:
        return existing

    profile = models.UserProfile(
        auth_user_id=auth_user_id,
        email=email,
        full_name=full_name,
        tc_no=tc_no,
        phone=phone,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@app.put("/profile/{user_id}/update", response_model=schemas.UserProfileResponse)
def update_profile(
    user_id: int,
    full_name: str = None,
    phone: str = None,
    db: Session = Depends(get_db),
):
    """Profil güncelle."""
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.auth_user_id == user_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    if full_name:
        profile.full_name = full_name
    if phone:
        profile.phone = phone
    db.commit()
    db.refresh(profile)
    return profile
