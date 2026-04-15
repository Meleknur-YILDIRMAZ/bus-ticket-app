"""
Trip Service — Otobüs sefer arama ve koltuk yönetimi.

Portlar:
  - Bu servis: 8003
  - Nginx proxy: /api/trip/
"""

import random
from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from .database import SessionLocal, engine, Base
from . import models, schemas

# Tablo oluştur
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Trip Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Dependency
# ──────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ──────────────────────────────────────────────
# Mock veri: Gerçek otobüs firmaları ve fiyatlar
# ──────────────────────────────────────────────
BUS_COMPANIES = [
    {"company": "Pamukkale Turizm",  "bus_type": "2+1", "base_mult": 1.35},
    {"company": "Ulusoy Turizm",     "bus_type": "2+1", "base_mult": 1.4},
    {"company": "Varan Turizm",      "bus_type": "2+1", "base_mult": 1.45},
    {"company": "Kamil Koç",         "bus_type": "2+2", "base_mult": 1.2},
    {"company": "Metro Turizm",      "bus_type": "2+2", "base_mult": 1.0},
    {"company": "Nilüfer Turizm",    "bus_type": "2+2", "base_mult": 1.1},
    {"company": "Süha Turizm",       "bus_type": "2+2", "base_mult": 1.05},
    {"company": "Ben Turizm",        "bus_type": "2+2", "base_mult": 1.15},
    {"company": "Esadaş Turizm",     "bus_type": "2+2", "base_mult": 1.0},
    {"company": "Anadolu Ulaşım",    "bus_type": "2+2", "base_mult": 0.95},
]

DISTANCE_PRICES = [
    # (km_max, base_fiyat)
    (200,  300),
    (500,  650),
    (800, 1000),
    (9999, 1400),
]


def estimate_price(from_city: str, to_city: str) -> int:
    """Şehir kombinasyonuna göre gerçekçi baz fiyat."""
    known = {
        ("İstanbul", "Ankara"): 900,
        ("Ankara", "İstanbul"): 900,
        ("İstanbul", "İzmir"): 850,
        ("İzmir", "İstanbul"): 850,
        ("İstanbul", "Bursa"): 300,
        ("Bursa", "İstanbul"): 300,
        ("İstanbul", "Trabzon"): 1100,
        ("Trabzon", "İstanbul"): 1100,
        ("İstanbul", "Van"): 1600,
        ("Van", "İstanbul"): 1600,
        ("Gaziantep", "İstanbul"): 1600,
        ("İstanbul", "Gaziantep"): 1600,
        ("Kayseri", "Ankara"): 650,
        ("Ankara", "Kayseri"): 650,
    }
    key = (from_city, to_city)
    base = known.get(key, random.randint(500, 1200))
    return base


def generate_departure_times() -> list:
    hours = [6, 8, 10, 12, 14, 16, 18, 20, 22]
    random.shuffle(hours)
    return [f"{h:02d}:00" for h in sorted(hours[:4])]


def calc_arrival(dep_time: str, duration_h: int, duration_m: int) -> str:
    h, m = map(int, dep_time.split(":"))
    total_m = h * 60 + m + duration_h * 60 + duration_m
    return f"{(total_m // 60) % 24:02d}:{total_m % 60:02d}"


# ──────────────────────────────────────────────
# Endpoint'ler
# ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "trip"}


# ──────────────────────────────────────────────
# Yardımcı Fonksiyonlar: Yol Haritası ve Saatler
# ──────────────────────────────────────────────
def generate_itinerary(from_city: str, to_city: str, dep_time: str, total_duration_str: str):
    """Güzergah üzerindeki durakları ve saatleri üretir."""
    h_total = int(total_duration_str.split('s')[0])
    m_total = int(total_duration_str.split(' ')[1].replace('dk', ''))
    total_min = h_total * 60 + m_total
    
    # Rotalar için durak havuzu
    route_stops = {
        "İstanbul": ["İzmit", "Bolu (Mola)", "Düzce", "Ankara"],
        "Ankara": ["Kırıkkale", "Aksaray (Mola)", "Pozantı", "Adana"],
        "İzmir": ["Manisa", "Uşak", "Afyon (Mola)", "Konya"],
        "Bursa": ["Balıkesir", "Manisa", "İzmir"],
        "Antalya": ["Isparta", "Afyon", "Kütahya", "Eskişehir"],
    }
    
    stops = route_stops.get(from_city, ["Şehir Merkezi", "Dinlenme Tesisi (Mola)", "İlçe Terminali"])
    if stops[-1] != to_city:
        stops.append(to_city)
        
    itinerary = []
    start_h, start_m = map(int, dep_time.split(':'))
    current_total_m = start_h * 60 + start_m
    
    # İlk durak her zaman kalkış
    itinerary.append({"station": f"{from_city} Otogarı", "time": dep_time, "is_mola": False})
    
    # Ara duraklar
    step_min = total_min // (len(stops) + 1)
    for i, stop in enumerate(stops):
        current_total_m += step_min + (15 if "Mola" in stop else 0)
        time_str = f"{(current_total_m // 60) % 24:02d}:{current_total_m % 60:02d}"
        itinerary.append({
            "station": stop if "Mola" not in stop else stop.split(' (')[0],
            "time": time_str,
            "is_mola": "Mola" in stop
        })
        
    return itinerary

@app.get("/bus/search")
def search_bus(
    from_city: str = Query(..., alias="from"),
    to_city: str = Query(..., alias="to"),
    date: str = Query(...),
    passengers: int = Query(1),
    db: Session = Depends(get_db),
):
    """Otobüs seferlerini ara — mock veri döner."""
    if from_city == to_city:
        return []

    base_price = estimate_price(from_city, to_city)
    duration_h = random.randint(3, 14)
    duration_m = random.choice([0, 15, 30, 45])
    duration_str = f"{duration_h}s {duration_m}dk"

    departures = generate_departure_times()
    companies = random.sample(BUS_COMPANIES, min(len(BUS_COMPANIES), 6))

    trips = []
    for i, (dep_time, comp) in enumerate(zip(departures, companies)):
        price = int(base_price * comp["base_mult"] * (1 + random.uniform(-0.1, 0.1)))
        arr_time = calc_arrival(dep_time, duration_h, duration_m)
        features = ["WiFi", "USB", "Klima", "Tuvalet"]
        if comp["bus_type"] == "2+1":
            features.append("Kişisel Ekran")

        trips.append({
            "id": f"BUS-{date}-{from_city[:3]}-{to_city[:3]}-{i}",
            "company": comp["company"],
            "bus_type": comp["bus_type"],
            "from_city": from_city,
            "to_city": to_city,
            "departure_time": dep_time,
            "arrival_time": arr_time,
            "duration": duration_str,
            "price": price,
            "available_seats": random.randint(5, 35),
            "features": " • ".join(features),
            "sun_side": random.choice(["left", "right"]),
            "itinerary": generate_itinerary(from_city, to_city, dep_time, duration_str)
        })

    return sorted(trips, key=lambda x: x["price"])


@app.get("/bus/{trip_id}/seats")
def get_bus_seats(trip_id: str):
    """Otobüs koltuk haritası — Sıralı numaralandırma ve gelişmiş kurallar."""
    # Tip belirleme
    is_2_plus_1 = "2+1" in trip_id.lower() or random.random() > 0.5
    
    seats = []
    total_rows = 13 if is_2_plus_1 else 14
    occupied_ratio = random.uniform(0.20, 0.50)
    
    current_seat_num = 1
    
    for row in range(1, total_rows + 1):
        # 2+1: Sol(1) + Sağ(2)  |  2+2: Sol(2) + Sağ(2)
        if is_2_plus_1:
            cols = ["L1", "R1", "R2"]
        else:
            cols = ["L1", "L2", "R1", "R2"]
            
        for col in cols:
            is_occupied = random.random() < occupied_ratio
            gender = random.choice(["female", "male"]) if is_occupied else None
            
            seats.append({
                "id": current_seat_num,
                "trip_id": trip_id,
                "seat_number": str(current_seat_num),
                "is_available": not is_occupied,
                "gender": gender,
                "side": "left" if col.startswith("L") else "right",
                "col_index": int(col[1]),
                "row": row,
                "bus_type": "2+1" if is_2_plus_1 else "2+2"
            })
            current_seat_num += 1

    # Kuralları Uygula
    total_seats = len(seats)
    for i, seat in enumerate(seats):
        # 1. Arka 4'lü Koltuk Kuralı (Sadece Erkek)
        if seat["id"] > total_seats - 4:
            seat["gender_restriction"] = "male"
            if not seat["is_available"]:
                seat["gender"] = "male" # Mock data tutarlılığı
        
        # 2. Yan Koltuk Cinsiyet Uyumluluğu (Neighbor Check)
        # 2+1'de sadece sağ taraf ikili. 2+2'de her iki taraf ikili.
        neighbor = None
        if seat["side"] == "right":
            # Sağda 1 ve 2 yan yanadır
            if seat["col_index"] == 1:
                # Koltuk 1 ise yanındaki 2'dir (eğer aynı sıradaysa)
                if i + 1 < len(seats) and seats[i+1]["row"] == seat["row"]:
                    neighbor = seats[i+1]
            else:
                # Koltuk 2 ise yanındaki 1'dir
                if i - 1 >= 0 and seats[i-1]["row"] == seat["row"]:
                    neighbor = seats[i-1]
        elif seat["side"] == "left" and not is_2_plus_1:
            # 2+2'de solda da ikili var
            if seat["col_index"] == 1:
                if i + 1 < len(seats) and seats[i+1]["row"] == seat["row"]:
                    neighbor = seats[i+1]
            else:
                if i - 1 >= 0 and seats[i-1]["row"] == seat["row"]:
                    neighbor = seats[i-1]
        
        if neighbor and not neighbor["is_available"]:
            seat["neighbor_gender"] = neighbor["gender"]
            if seat["is_available"]:
                # Eğer komşu doluysa, bu koltuk onun cinsiyetine kısıtlanır
                seat["gender_restriction"] = neighbor["gender"]

    return seats
