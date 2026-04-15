"""
Flight Service — Uçuş arama, koltuk yönetimi.

Port: 8004 (nginx: /api/flight/)
"""

import random
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import SessionLocal, engine, Base
from . import models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Flight Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Statik veri: Gerçek havalimanları ve havayolları
# ──────────────────────────────────────────────

AIRPORTS = {
    "IST": {"city": "İstanbul", "name": "İstanbul Havalimanı"},
    "SAW": {"city": "İstanbul", "name": "Sabiha Gökçen"},
    "YEI": {"city": "Bursa",    "name": "Yenişehir"},
    "TEQ": {"city": "Tekirdağ", "name": "Çorlu"},
    "ADB": {"city": "İzmir",    "name": "Adnan Menderes"},
    "BJV": {"city": "Muğla",   "name": "Milas-Bodrum"},
    "DLM": {"city": "Muğla",   "name": "Dalaman"},
    "AYT": {"city": "Antalya", "name": "Antalya"},
    "GZP": {"city": "Antalya", "name": "Gazipaşa"},
    "ISE": {"city": "Isparta", "name": "Süleyman Demirel"},
    "ESB": {"city": "Ankara",  "name": "Esenboğa"},
    "ASR": {"city": "Kayseri", "name": "Erkilet"},
    "KYA": {"city": "Konya",   "name": "Konya"},
    "NAV": {"city": "Nevşehir","name": "Kapadokya"},
    "VAS": {"city": "Sivas",   "name": "Nuri Demirağ"},
    "TZX": {"city": "Trabzon", "name": "Trabzon"},
    "SZF": {"city": "Samsun",  "name": "Çarşamba"},
    "OGU": {"city": "Ordu/Giresun", "name": "Ordu-Giresun"},
    "ERZ": {"city": "Erzurum", "name": "Erzurum"},
    "VAN": {"city": "Van",     "name": "Ferit Melen"},
    "DIY": {"city": "Diyarbakır","name": "Diyarbakır"},
    "GZT": {"city": "Gaziantep","name": "Gaziantep"},
    "MQM": {"city": "Mardin",  "name": "Mardin"},
    "SFQ": {"city": "Şanlıurfa","name": "GAP"},
}

AIRLINES = [
    {"code": "TK",  "name": "Türk Hava Yolları",    "mult": 1.3,  "meal": True,  "baggage": 20},
    {"code": "PC",  "name": "Pegasus Havayolları",   "mult": 1.0,  "meal": False, "baggage": 15},
    {"code": "AJ",  "name": "AnadoluJet",            "mult": 0.9,  "meal": False, "baggage": 15},
    {"code": "XQ",  "name": "SunExpress",            "mult": 1.1,  "meal": False, "baggage": 20},
]

AIRCRAFT = ["Boeing 737-800", "Airbus A320", "Airbus A321", "Boeing 737 MAX"]


def base_flight_price(from_code: str, to_code: str) -> int:
    """IATA koduna göre gerçekçi baz fiyat."""
    known = {
        ("IST", "ESB"): 800, ("ESB", "IST"): 800,
        ("IST", "ADB"): 700, ("ADB", "IST"): 700,
        ("IST", "AYT"): 750, ("AYT", "IST"): 750,
        ("IST", "TZX"): 900, ("TZX", "IST"): 900,
        ("IST", "ERZ"): 1100,("ERZ", "IST"): 1100,
        ("IST", "VAN"): 1200,("VAN", "IST"): 1200,
        ("IST", "GZT"): 1000,("GZT", "IST"): 1000,
        ("ESB", "ADB"): 650, ("ADB", "ESB"): 650,
        ("IST", "DIY"): 1050,("DIY", "IST"): 1050,
    }
    return known.get((from_code, to_code), random.randint(500, 1400))


def calc_arrival_time(dep: str, dur_min: int) -> str:
    h, m = map(int, dep.split(":"))
    total = h * 60 + m + dur_min
    return f"{(total // 60) % 24:02d}:{total % 60:02d}"


# ──────────────────────────────────────────────
# Endpoint'ler
# ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "flight"}


@app.get("/search")
def search_flights(
    from_airport: str = Query(..., alias="from"),
    to_airport: str = Query(..., alias="to"),
    date: str = Query(...),
    passengers: int = Query(1),
):
    """Uçuş arama — mock veri döner."""
    if from_airport == to_airport:
        return []

    from_info = AIRPORTS.get(from_airport)
    to_info   = AIRPORTS.get(to_airport)
    if not from_info or not to_info:
        return []

    base_price = base_flight_price(from_airport, to_airport)

    # 60‑180 dk uçuş süresi
    duration_min = random.randint(60, 180)
    departure_slots = ["07:00", "09:30", "12:00", "15:30", "18:00", "21:00"]
    random.shuffle(departure_slots)
    slots = departure_slots[:4]

    airlines = random.sample(AIRLINES, min(len(AIRLINES), 4))

    flights = []
    for i, (dep, airline) in enumerate(zip(slots, airlines)):
        price = int(base_price * airline["mult"] * (1 + random.uniform(-0.08, 0.08)))
        arr = calc_arrival_time(dep, duration_min)
        hours, mins = divmod(duration_min, 60)

        flights.append({
            "id": f"FL-{date}-{from_airport}-{to_airport}-{i}",
            "flight_number": f"{airline['code']}{random.randint(100,999)}",
            "airline": airline["name"],
            "airline_code": airline["code"],
            "from_airport": from_airport,
            "to_airport": to_airport,
            "from_city": from_info["city"],
            "to_city": to_info["city"],
            "departure_time": dep,
            "arrival_time": arr,
            "duration": f"{hours}s {mins}dk",
            "stops": 0,
            "aircraft_type": random.choice(AIRCRAFT),
            "economy_price": price,
            "business_price": int(price * 2.5),
            "price": price,
            "baggage": airline["baggage"],
            "meal_included": airline["meal"],
            "sun_side": random.choice(["left", "right"]),
            "stops_info": "Direkt Uçuş" if random.random() > 0.2 else "1 Aktarma (SAW)"
        })

    return sorted(flights, key=lambda x: x["price"])


@app.get("/{flight_id}/seats")
def get_flight_seats(flight_id: str):
    """Uçak koltuk şeması — Boeing 737 / A320 düzeni (3+3)."""
    seats = []
    seat_id = 1

    # Business: sıra 1-5 (2+2 düzeni, A-B / D-E)
    for row in range(1, 6):
        for col in ["A", "B", "D", "E"]:
            is_occupied = random.random() < 0.3
            seats.append({
                "id": seat_id,
                "flight_id": flight_id,
                "seat_number": f"{row}{col}",
                "seat_class": "business",
                "is_available": not is_occupied,
                "extra_legroom": False,
                "price_multiplier": 2.5,
            })
            seat_id += 1

    # Emergency exit: sıra 14-15 (ekstra bacak mesafesi)
    exit_rows = {14, 15}

    # Economy: sıra 7-34 (3+3 düzeni, A-B-C / D-E-F)
    for row in range(7, 35):
        for col in ["A", "B", "C", "D", "E", "F"]:
            is_occupied = random.random() < 0.45
            extra = row in exit_rows
            mult = 1.15 if extra else 1.0

            seats.append({
                "id": seat_id,
                "flight_id": flight_id,
                "seat_number": f"{row}{col}",
                "seat_class": "economy",
                "is_available": not is_occupied,
                "extra_legroom": extra,
                "price_multiplier": mult,
            })
            seat_id += 1

    return seats
