"""
Notification Service — Email/SMS bildirim yönetimi, Kafka consumer.

Port: 8007 (nginx: /api/notification/)
"""

import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import SessionLocal, engine, Base
from . import models, schemas

Base.metadata.create_all(bind=engine)

logger = logging.getLogger("notification-service")

app = FastAPI(title="Notification Service", version="1.0.0")

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
    return {"status": "healthy", "service": "notification"}


@app.post("/send", response_model=schemas.NotificationResponse)
def send_notification(notif: schemas.NotificationCreate, db: Session = Depends(get_db)):
    """
    Bildirim gönder (mock — gerçek SMTP/SMS yok, sadece DB kaydı).
    Kafka consumer da aynı fonksiyonu kullanır.
    """
    logger.info(
        "Sending %s notification to %s (booking: %s)",
        notif.notification_type,
        notif.recipient_email,
        notif.booking_ref,
    )

    db_notif = models.Notification(
        recipient_email=notif.recipient_email,
        recipient_phone=notif.recipient_phone,
        subject=notif.subject,
        body=notif.body,
        notification_type=notif.notification_type,
        status="sent",
        booking_ref=notif.booking_ref,
    )
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)

    return schemas.NotificationResponse(
        id=db_notif.id,
        status="sent",
        message=f"Bildirim gönderildi: {notif.recipient_email}",
    )


@app.post("/booking-confirmed")
def booking_confirmed_notification(
    booking_ref: str,
    email: str,
    passenger_name: str,
    db: Session = Depends(get_db),
):
    """Rezervasyon onay e-postası (Kafka mesajı ile tetiklenebilir)."""
    notif = schemas.NotificationCreate(
        recipient_email=email,
        subject=f"Rezervasyonunuz Onaylandı — {booking_ref}",
        body=(
            f"Sayın {passenger_name},\n\n"
            f"Rezervasyonunuz başarıyla oluşturulmuştur.\n"
            f"Rezervasyon Referans No: {booking_ref}\n\n"
            "İyi yolculuklar dileriz.\n"
            "BiletRez Ekibi"
        ),
        notification_type="email",
        booking_ref=booking_ref,
    )
    send_notification(notif, db)
    return {"status": "ok", "message": "Onay maili gönderildi"}
