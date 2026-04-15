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
    const cardNumber = document.getElementById('cardNumber').value;
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardCVV = document.getElementById('cardCVV').value;

    const cardName = cardNameInput ? cardNameInput.value : '';

    // Validations
    if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{2,50}$/.test(cardName)) {
        showNotification('Kart üzerindeki isim geçersiz', 'error');
        return;
    }

    if (!luhnCheck(cardNumber)) {
        showNotification('Geçersiz kart numarası', 'error');
        return;
    }

    // Check expiry
    const [month, year] = cardExpiry.split('/');
    const now = new Date();
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    if (!month || !year || expiry < now) {
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
        
        const seatId = window.selectedSeatsByTrip[window.selectedTrip.id] ? 
                       window.selectedSeatsByTrip[window.selectedTrip.id].id : 0;
        
        const requestBody = {
            trip_id: window.selectedTrip.id,
            trip_type: window.selectedTrip.type || 'bus',
            seats: [seatId],
            passengers: window.currentPassengers || [],
            payment: {
                card_name: cardName,
                card_number: cardNumber.replace(/\s/g, ''),
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
            throw new Error(`Ödeme işlemi başarısız: ${response.status}`);
        }

        // Success Handling
        if (result.status === 'success') {
            closeModal('paymentModal');
            showNotification('Ödeme başarılı! Biletiniz onaylandı.', 'success');
            
            // Save booking to localStorage for profile view
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
                seat_numbers: window.currentPassengers && window.currentPassengers[0] ? 
                              window.currentPassengers[0].seat_number : 'Belirtilmemiş',
                passenger_count: window.currentPassengers ? window.currentPassengers.length : 1,
                total_price: window.selectedTrip.price,
                status: 'Aktif'
            };
            
            const existingBookings = JSON.parse(localStorage.getItem('my_bookings') || '[]');
            existingBookings.push(newBooking);
            localStorage.setItem('my_bookings', JSON.stringify(existingBookings));

            const savedTrip = { ...window.selectedTrip };
            const savedPassenger = window.currentPassengers && window.currentPassengers[0] ? 
                                   { ...window.currentPassengers[0] } : { full_name: cardName, seat_number: 'Belirtilmemiş' };

            // Clear selections
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
    const resultsSection = document.getElementById('results');
    if (!resultsSection) {
        console.error("results section not found");
        return;
    }
    
    resultsSection.style.display = 'block';
    resultsSection.innerHTML = `
        <div class="ticket-success-container" style="max-width: 550px; margin: 2rem auto; border: 1px solid var(--border-light); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-medium); background: white; animation: fadeIn 0.6s ease;">
            <div style="background: var(--primary-dusty); color: white; padding: 1.5rem; text-align: center;">
                <h2 style="margin: 0; color: white; font-weight: 700;">Biletiniz Onaylandı!</h2>
                <p style="margin: 5px 0 0; font-size: 0.9rem; opacity: 0.9;">İyi yolculuklar dileriz.</p>
            </div>
            
            <div style="padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; border-bottom: 2px dashed var(--bg-dusty); padding-bottom: 15px; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-light);">PNR Kodu</div>
                        <div style="font-weight: 700; font-size: 1.3rem; color: var(--primary-darker);">${booking.id}</div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px; background: var(--bg-light); border-radius: 8px;">
                    <div style="text-align: left;">
                        <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary-darker);">${trip.departure_time || booking.time}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${booking.from_location}</div>
                    </div>
                    <div style="color: var(--primary-dusty); font-size: 1.5rem;">➞</div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary-darker);">${trip.arrival_time || '--:--'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${booking.to_location}</div>
                    </div>
                </div>
                
                <div style="border: 1px solid var(--border-light); padding: 15px; border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary);">Firma:</span>
                        <strong style="color: var(--primary-darker);">${booking.company}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary);">Yolcu:</span>
                        <strong style="color: var(--primary-darker);">${passenger.full_name}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-secondary);">Koltuk No:</span>
                        <strong style="color: var(--primary-dusty); font-size: 1.2rem;">${passenger.seat_number}</strong>
                    </div>
                </div>
                
                <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                    <button class="confirm-btn" onclick="showPage('profile')">Biletlerimi Görüntüle</button>
                    <button class="tab-btn" style="width: 100%; border: 1px solid var(--primary-dusty); color: var(--primary-dusty);" onclick="window.location.href='/'">Ana Sayfaya Dön</button>
                </div>
            </div>
        </div>
    `;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}