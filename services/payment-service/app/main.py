"""
Payment Service — Mock ödeme işlemi (3D Secure simülasyonu).

Port: 8006 (nginx: /api/payment/)
"""

import random
import string
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import Depends

from .database import SessionLocal, engine, Base
from . import models, schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payment Service", version="1.0.0")

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


def generate_payment_id() -> str:
    suffix = "".join(random.choices(string.digits, k=10))
    return f"PAY-{suffix}"


def generate_booking_ref() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"BK-{suffix}"


def luhn_check(card_number: str) -> bool:
    """Kart numarası kontrolü (Demo: Sadece 16 hane kontrolü)."""
    clean = card_number.replace(" ", "")
    return len(clean) == 16 and clean.isdigit()


# ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "payment"}


@app.post("/process", response_model=schemas.PaymentResponse)
def process_payment(request: schemas.PaymentRequest, db: Session = Depends(get_db)):
    """
    Mock ödeme işlemi:
    - Luhn kontrolü
    - 3D Secure simülasyonu (%95 başarı oranı)
    - Ödeme kaydı oluşturma
    """
    payment_data = request.payment
    card_number = str(payment_data.get("card_number", "")).replace(" ", "")
    card_name   = str(payment_data.get("card_name", ""))
    amount      = float(payment_data.get("amount", 0))

    # Kart doğrulama (Demo için basitleştirdik)
    if not luhn_check(card_number):
        raise HTTPException(status_code=400, detail="Geçersiz kart numarası")

    # Mock 3D Secure — Demo için %100 başarılı yapıyoruz

    payment_id  = generate_payment_id()
    booking_ref = generate_booking_ref()

    # Ödeme kaydı
    db_payment = models.Payment(
        payment_id=payment_id,
        booking_ref=booking_ref,
        amount=amount,
        card_last4=card_number[-4:],
        card_name=card_name,
        status="success",
        three_d_passed=True,
    )
    db.add(db_payment)
    db.commit()

    return schemas.PaymentResponse(
        status="success",
        payment_id=payment_id,
        booking_ref=booking_ref,
        message="Ödeme başarıyla tamamlandı",
    )


@app.get("/{payment_id}/status")
def payment_status(payment_id: str, db: Session = Depends(get_db)):
    payment = db.query(models.Payment).filter(
        models.Payment.payment_id == payment_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    return {"payment_id": payment_id, "status": payment.status, "amount": payment.amount}
