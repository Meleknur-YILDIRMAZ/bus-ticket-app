// Payment Service Integration

// Format card number with spaces
document.addEventListener('DOMContentLoaded', function() {
    const cardInput = document.getElementById('cardNumber');
    if (cardInput) {
        cardInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            let formatted = '';
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += ' ';
                formatted += value[i];
            }
            e.target.value = formatted.substring(0, 19);
        });
    }

    // Format expiry date
    const expiryInput = document.getElementById('cardExpiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }

    // Only numbers for CVV
    const cvvInput = document.getElementById('cardCVV');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
        });
    }
});

// Luhn algorithm for card validation (Simplified for Demo Testing)
function luhnCheck(cardNumber) {
    const clean = cardNumber.replace(/\s/g, '');
    return clean.length === 16 && /^\d+$/.test(clean);
}

// Process payment
async function processPayment() {
    const cardNameInput = document.getElementById('cardHolder');
    const cardNumberRaw = document.getElementById('cardNumber').value;
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardCVV = document.getElementById('cardCVV').value;

    const cardName = cardNameInput ? cardNameInput.value.trim() : '';
    // Boşlukları temizle — backend her zaman boşluksuz bekler
    const cardNumberClean = cardNumberRaw.replace(/\s/g, '');

    // Validations
    if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{2,50}$/.test(cardName)) {
        showNotification('Kart üzerindeki isim geçersiz', 'error');
        return;
    }

    if (!luhnCheck(cardNumberRaw)) {
        showNotification('Geçersiz kart numarası (16 haneli olmalı)', 'error');
        return;
    }

    // Check expiry
    const parts = cardExpiry.split('/');
    const month = parts[0];
    const year = parts[1];
    const now = new Date();
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    if (!month || !year || isNaN(expiry.getTime()) || expiry < now) {
        showNotification('Son kullanma tarihi geçersiz', 'error');
        return;
    }

    if (!/^\d{3}$/.test(cardCVV)) {
        showNotification('CVV 3 haneli olmalı', 'error');
        return;
    }

    // Show loading
    const payBtnText = document.getElementById('payBtnText');
    const paySpinner = document.getElementById('paySpinner');
    if (payBtnText) payBtnText.style.display = 'none';
    if (paySpinner) paySpinner.style.display = 'inline-block';

    try {
        if (!window.selectedTrip) {
            throw new Error('Sefer bilgisi bulunamadı');
        }

        const seatId = window.selectedSeatsByTrip && window.selectedSeatsByTrip[window.selectedTrip.id]
            ? window.selectedSeatsByTrip[window.selectedTrip.id].id
            : 0;

        const requestBody = {
            trip_id: window.selectedTrip.id,
            trip_type: window.selectedTrip.type || 'bus',
            seats: [seatId],
            passengers: window.currentPassengers || [],
            payment: {
                card_name: cardName,
                card_number: cardNumberClean,   // Her zaman boşluksuz gönder
                expiry: cardExpiry,
                cvv: cardCVV,
                amount: window.selectedTrip.price
            }
        };

        const response = await fetch('/api/payment/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(requestBody)
        });

        let result = {};

        if (response.ok) {
            result = await response.json();
        } else {
            const errorText = await response.text();
            console.error("Payment API Error:", response.status, errorText);
            // Backend'den gelen Türkçe hata mesajını kullanıcıya göster
            let detail = '';
            try {
                const errJson = JSON.parse(errorText);
                detail = errJson.detail || errorText;
            } catch {
                detail = errorText;
            }
            throw new Error(detail || `Ödeme işlemi başarısız: ${response.status}`);
        }

        // Success Handling
        if (result.status === 'success') {
            closeModal('paymentModal');
            showNotification('Ödeme başarılı! Biletiniz onaylandı.', 'success');

            const pnrCode = result.booking_ref || ('PNR-' + Math.random().toString(36).substr(2, 6).toUpperCase());
            const newBooking = {
                id: pnrCode,
                payment_id: result.payment_id,
                trip_id: window.selectedTrip.id,
                from_location: window.selectedTrip.from_city || window.selectedTrip.from_airport,
                to_location: window.selectedTrip.to_city || window.selectedTrip.to_airport,
                company: window.selectedTrip.company || window.selectedTrip.airline,
                date: window.selectedTrip.departure_time || 'Bugün',
                time: window.selectedTrip.departure_time || '10:00',
                seat_numbers: window.currentPassengers && window.currentPassengers[0]
                    ? window.currentPassengers[0].seat_number
                    : 'Belirtilmemiş',
                passenger_count: window.currentPassengers ? window.currentPassengers.length : 1,
                total_price: window.selectedTrip.price,
                status: 'Aktif'
            };

            const existingBookings = JSON.parse(localStorage.getItem('my_bookings') || '[]');
            existingBookings.push(newBooking);
            localStorage.setItem('my_bookings', JSON.stringify(existingBookings));

            const savedTrip = { ...window.selectedTrip };
            const savedPassenger = window.currentPassengers && window.currentPassengers[0]
                ? { ...window.currentPassengers[0] }
                : { full_name: cardName, seat_number: 'Belirtilmemiş' };

            // Seçimleri temizle
            window.selectedSeatsByTrip = {};
            window.currentPassengers = [];
            window.selectedTrip = null;

            console.log("Booking successful, rendering success ticket:", pnrCode);
            setTimeout(() => {
                showSuccessTicket(savedTrip, savedPassenger, newBooking);
            }, 500);

        } else {
            throw new Error(result.detail || 'Ödeme işlemi tamamlanamadı');
        }
    } catch (error) {
        console.error("Payment Error:", error);
        showNotification("Ödeme başarısız: " + error.message, 'error');
    } finally {
        if (payBtnText) payBtnText.style.display = 'inline';
        if (paySpinner) paySpinner.style.display = 'none';
    }
}

function showSuccessTicket(trip, passenger, booking) {
    // ÖNEMLİ: results section'ının innerHTML'ini DEĞİŞTİRME!
    // resultsList'i korumak için ayrı bir overlay div kullan.
    
    // Eski ticket varsa kaldır
    const existing = document.getElementById('ticketSuccessOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ticketSuccessOverlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 1500;
        background: rgba(93, 82, 99, 0.6);
        backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
        animation: fadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
        <div style="max-width: 550px; width: 100%; border-radius: 12px; overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3); background: white;
                    animation: fadeIn 0.4s ease;">

            <!-- Başlık -->
            <div style="background: var(--primary-dusty, #9B8AA5); color: white;
                        padding: 1.5rem; text-align: center;">
                <div style="font-size: 2.5rem; margin-bottom: 8px;">✓</div>
                <h2 style="margin: 0; color: white; font-weight: 700;">Biletiniz Onaylandı!</h2>
                <p style="margin: 5px 0 0; font-size: 0.9rem; opacity: 0.9;">İyi yolculuklar dileriz.</p>
            </div>

            <!-- İçerik -->
            <div style="padding: 1.5rem;">
                <!-- PNR -->
                <div style="display: flex; justify-content: space-between;
                            border-bottom: 2px dashed #eee; padding-bottom: 15px; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 0.8rem; color: #999;">PNR Kodu</div>
                        <div style="font-weight: 700; font-size: 1.3rem; color: #4A3F4F;">${booking.id}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: #999;">Toplam Ücret</div>
                        <div style="font-weight: 700; font-size: 1.3rem; color: #9B8AA5;">${booking.total_price} TL</div>
                    </div>
                </div>

                <!-- Güzergah -->
                <div style="display: flex; justify-content: space-between; align-items: center;
                            margin-bottom: 20px; padding: 10px; background: #FAF7FA; border-radius: 8px;">
                    <div style="text-align: left;">
                        <div style="font-size: 1.2rem; font-weight: 700; color: #4A3F4F;">${trip.departure_time || booking.time}</div>
                        <div style="font-size: 0.8rem; color: #7A6B82;">${booking.from_location}</div>
                    </div>
                    <div style="color: #9B8AA5; font-size: 1.5rem;">➞</div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.2rem; font-weight: 700; color: #4A3F4F;">${trip.arrival_time || '--:--'}</div>
                        <div style="font-size: 0.8rem; color: #7A6B82;">${booking.to_location}</div>
                    </div>
                </div>

                <!-- Detaylar -->
                <div style="border: 1px solid #eee; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #999;">Firma:</span>
                        <strong style="color: #4A3F4F;">${booking.company}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #999;">Yolcu:</span>
                        <strong style="color: #4A3F4F;">${passenger.full_name}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #999;">Koltuk No:</span>
                        <strong style="color: #9B8AA5; font-size: 1.2rem;">${passenger.seat_number}</strong>
                    </div>
                </div>

                <!-- Butonlar -->
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button onclick="showPage('profile'); document.getElementById('ticketSuccessOverlay').remove();"
                        style="background: linear-gradient(135deg, #9B8AA5, #5D5263); color: white;
                               border: none; padding: 14px; border-radius: 12px; font-weight: 700;
                               cursor: pointer; font-size: 1rem;">
                        Biletlerimi Görüntüle
                    </button>
                    <button onclick="document.getElementById('ticketSuccessOverlay').remove(); resetResultsSection();"
                        style="background: white; border: 1px solid #9B8AA5; color: #9B8AA5;
                               padding: 12px; border-radius: 12px; font-weight: 600;
                               cursor: pointer; font-size: 1rem;">
                        Yeni Bilet Al
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Overlay dışına tıklanınca kapat
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
}