"""
Booking Service — Rezervasyon yönetimi, koltuk kilitleme.

Port: 8005 (nginx: /api/booking/)
"""

import random
import string
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .database import SessionLocal, engine, Base
from . import models, schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Booking Service", version="1.0.0")

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


def generate_ref(prefix: str = "BK") -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"{prefix}-{suffix}"


# ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "booking"}


@app.post("/create", response_model=schemas.BookingResponse)
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    """Yeni rezervasyon oluştur."""
    ref = generate_ref("BK")
    db_booking = models.Booking(
        booking_ref=ref,
        trip_id=booking.trip_id,
        trip_type=booking.trip_type,
        seat_number=booking.seat_number,
        passenger_name=booking.passenger_name,
        passenger_tc=booking.passenger_tc,
        passenger_gender=booking.passenger_gender,
        passenger_phone=booking.passenger_phone,
        passenger_email=booking.passenger_email,
        total_price=booking.total_price,
        status="pending",
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking


@app.get("/user/{user_id}", response_model=List[schemas.BookingResponse])
def get_user_bookings(user_id: int, db: Session = Depends(get_db)):
    """Kullanıcının tüm rezervasyonlarını listele."""
    return db.query(models.Booking).filter(
        models.Booking.user_id == user_id,
        models.Booking.is_active == True,
    ).all()


@app.patch("/{booking_ref}/confirm")
def confirm_booking(booking_ref: str, payment_id: str, db: Session = Depends(get_db)):
    """Ödeme sonrası rezervasyonu onayla."""
    booking = db.query(models.Booking).filter(
        models.Booking.booking_ref == booking_ref
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Rezervasyon bulunamadı")
    booking.status = "confirmed"
    booking.payment_id = payment_id
    db.commit()
    return {"status": "confirmed", "booking_ref": booking_ref}


@app.delete("/{booking_ref}/cancel")
def cancel_booking(booking_ref: str, db: Session = Depends(get_db)):
    """Rezervasyon iptali."""
    booking = db.query(models.Booking).filter(
        models.Booking.booking_ref == booking_ref
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Rezervasyon bulunamadı")
    booking.status = "cancelled"
    booking.is_active = False
    db.commit()
    return {"status": "cancelled", "booking_ref": booking_ref}
