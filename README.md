# Bilet-K: Mikroservis Tabanlı Bilet Rezervasyon Sistemi

Bu proje, modern mikroservis mimarisi kullanılarak geliştirilmiş kapsamlı bir bilet rezervasyon platformudur. Proje; Python (FastAPI), PostgreSQL, Redis, Kafka ve Nginx gibi teknolojileri kullanarak ölçeklenebilir ve dayanıklı bir yapı sunar.

## 🚀 Teknolojiler

- **Backend:** Python (FastAPI)
- **Database:** PostgreSQL
- **Cache:** Redis
- **Message Queue:** Kafka & Zookeeper
- **Frontend:** HTML/JS (Nginx üzerinden servis edilir)
- **Container:** Docker & Docker Compose
- **Orchestration:** Kubernetes (K8s)
- **API Gateway:** Nginx Ingress

## 📂 Proje Yapısı

```text
bus-ticket-app/
│
├── services/
│   ├── auth-service/           # Kullanıcı kayıt ve giriş (JWT)
│   ├── user-service/           # Profil ve kullanıcı yönetimi
│   ├── trip-service/           # Sefer yönetimi (Otobüs/Ulaşım)
│   ├── booking-service/        # Bilet satın alma ve rezervasyon
│   ├── payment-service/        # Ödeme işlemleri (Mock)
│   └── notification-service/   # E-posta/SMS bildirimleri (Kafka Consumer)
│
├── k8s/                        # Kubernetes Deployment, Service ve Ingress dosyaları
├── nginx/                      # API Gateway konfigürasyonu
├── frontend/                   # Kullanıcı arayüzü dosyaları
└── docker-compose.yml          # Yerel geliştirme ortamı
```

## 🛠️ Kurulum ve Çalıştırma

### 1. Docker Compose ile Yerel Çalıştırma (Hızlı Başlatma)

Sistemi tüm bağımlılıkları (DB, Redis, Kafka) ile birlikte yerel makinenizde çalıştırmak için:

```bash
# Proje kök dizininde
docker-compose up --build -d
```

Çalıştıktan sonra aşağıdaki portlar üzerinden erişim sağlayabilirsiniz:
- **Frontend:** [http://localhost](http://localhost) (Port 80)
- **Auth Service:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **User Service:** [http://localhost:8002/docs](http://localhost:8002/docs)
- **Trip Service:** [http://localhost:8003/docs](http://localhost:8003/docs)
- **Booking Service:** [http://localhost:8005/docs](http://localhost:8005/docs)

### 2. Kubernetes (K8s) ile Dağıtım

Proje `bilet-system` namespace'i altında çalışacak şekilde yapılandırılmıştır.

```bash
# 1. Namespace oluşturma
kubectl apply -f k8s/namespace.yaml

# 2. Config ve Secret'ları tanımlama
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# 3. Altyapı servislerini başlatma (DB, Cache, Queue)
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/zookeeper.yaml
kubectl apply -f k8s/kafka-statefulset.yaml

# 4. Mikroservisleri ayağa kaldırma
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/trip-service.yaml
kubectl apply -f k8s/booking-service.yaml
kubectl apply -f k8s/payment-service.yaml
kubectl apply -f k8s/notification-service.yaml

# 5. API Gateway (Ingress) yapılandırması
kubectl apply -f k8s/nginx-ingress.yaml
```

Servislerin durumunu kontrol etmek için:
```bash
kubectl get pods -n bilet-system
```

## 🧠 Sistem Mimarisi

1. **API Gateway (Nginx):** Tüm dış istekleri karşılar ve ilgili mikroservise yönlendirir.
2. **Event-Driven Architecture:** Servisler arası iletişim Kafka üzerinden asenkron olarak gerçekleşir (Örn: Rezervasyon tamamlandığında Notification servisine mesaj gider).
3. **Database per Service:** Her kritik servis kendi veri şemasına ve PostgreSQL bağlantısına sahiptir.
4. **Caching:** Sık sorgulanan sefer bilgileri Redis üzerinde önbelleğe alınır.

## 📝 Lisans
Bu proje eğitim amaçlı geliştirilmiştir. Tüm hakları saklıdır.
