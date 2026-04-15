// Global Veri Havuzu (Global Store)
window.tripsStore = window.tripsStore || {};
window.selectedSeatsByTrip = window.selectedSeatsByTrip || {};
let activeGenderBubble = null;

// Toggle Inline Selection Area
async function toggleInlineSelection(tripId, type) {
    const tripObj = window.tripsStore[tripId];
    if (!tripObj) {
        console.error("Trip not found in store:", tripId);
        return;
    }

    const area = document.getElementById(`selection-${tripId}`);
    const card = document.getElementById(`card-${tripId}`);
    const btn = document.getElementById(`btn-${tripId}`);

    if (area.classList.contains('active')) {
        area.classList.remove('active');
        card.classList.remove('expanded');
        btn.textContent = 'Koltuk Seç';
        btn.classList.remove('active');
        return;
    }

    // Diğerlerini kapat
    document.querySelectorAll('.selection-area.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.trip-card.expanded').forEach(el => el.classList.remove('expanded'));
    document.querySelectorAll('.select-btn.active').forEach(el => {
        el.textContent = 'Koltuk Seç';
        el.classList.remove('active');
    });

    selectedTrip = { ...tripObj, type: type };
    area.classList.add('active');
    card.classList.add('expanded');
    btn.textContent = 'Kapat';
    btn.classList.add('active');

    area.innerHTML = '<div class="loading-inline">Yükleniyor...</div>';
    try {
        const endpoint = type === 'bus' ? `/api/trip/bus/${tripId}/seats` : `/api/flight/${tripId}/seats`;
        const response = await fetch(endpoint);
        const seats = await response.json();
        renderInlineLayout(seats, area, type, tripObj);
    } catch (error) {
        area.innerHTML = '<div class="error-inline">Koltuk bilgisi alınamadı.</div>';
    }
}

// Render everything inside the card
function renderInlineLayout(seats, container, type, tripObj) {
    container.innerHTML = '';
    
    // 1. Yol Haritası (Sol)
    const itContainer = document.createElement('div');
    itContainer.className = 'itinerary-container';
    itContainer.innerHTML = '<h4 style="margin-bottom:15px; font-size:1.1rem; color:var(--primary-deep); font-weight:900;">Yol Haritası</h4>';
    const timeline = document.createElement('div');
    timeline.className = 'itinerary-timeline';
    if (tripObj.itinerary) {
        tripObj.itinerary.forEach(item => {
            const row = document.createElement('div');
            row.className = `timeline-item ${item.is_mola ? 'mola' : ''}`;
            row.innerHTML = `<span class="timeline-time">${item.time}</span><span class="timeline-station">${item.station}</span>${item.is_mola?'<span class="mola-label">☕ Mola</span>':''}`;
            timeline.appendChild(row);
        });
    }
    itContainer.appendChild(timeline);

    // 2. Koltuk Haritası (Orta)
    const mapPart = document.createElement('div');
    mapPart.className = 'map-part';
    const sunSide = tripObj.sun_side || 'right';
    mapPart.innerHTML = `<div class="sun-info"><span>${sunSide==='left'?'☀️ ':''}</span>Güneş bu seferde ${sunSide==='left'?'sol':'sağ'} taraftan vuracaktır.<span>${sunSide==='right'?' ☀️':''}</span></div>`;

    const busContainer = document.createElement('div');
    busContainer.className = type === 'bus' ? 'bus-container' : 'plane-container';
    const driver = document.createElement('div');
    driver.className = 'driver-seat';
    driver.innerHTML = type === 'bus' ? '🛞' : '✈️';
    busContainer.appendChild(driver);

    const seatGrid = document.createElement('div');
    seatGrid.className = 'seat-grid';
    const rows = {};
    seats.forEach(s => {
        let r = s.row;
        if (r === undefined) { const m = s.seat_number.toString().match(/\d+/); r = m ? m[0] : "1"; }
        if (!rows[r]) rows[r] = [];
        rows[r].push(s);
    });

    Object.keys(rows).sort((a,b) => a-b).forEach(r => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';
        const rowSeats = rows[r];
        if (type === 'bus') {
            // Sol tarafı (tekli koltuklar) ekranın soluna çiz
            rowSeats.filter(s => s.side === 'left').forEach(s => rowDiv.appendChild(createInlineSeat(s, tripObj)));
            const aisle = document.createElement('div'); aisle.className='aisle-space'; rowDiv.appendChild(aisle);
            // Sağ tarafı (2'li koltuklar) ekranın sağına çiz
            rowSeats.filter(s => s.side === 'right').forEach(s => rowDiv.appendChild(createInlineSeat(s, tripObj)));
        } else {
            rowSeats.filter(s => ['A','B','C'].includes(s.seat_number.slice(-1))).forEach(s => rowDiv.appendChild(createInlineSeat(s, tripObj)));
            const aisle = document.createElement('div'); aisle.className='aisle-space'; rowDiv.appendChild(aisle);
            rowSeats.filter(s => ['D','E','F'].includes(s.seat_number.slice(-1))).forEach(s => rowDiv.appendChild(createInlineSeat(s, tripObj)));
        }
        seatGrid.appendChild(rowDiv);
    });
    busContainer.appendChild(seatGrid);
    mapPart.appendChild(busContainer);

    // 3. Yolcu Formu (Sağ)
    const formPart = document.createElement('div');
    formPart.className = 'passenger-side';
    formPart.id = `form-side-${tripObj.id}`;
    formPart.innerHTML = `
        <div class="info-msg" style="text-align:center; color:var(--text-soft); font-weight:700; margin-top:40px; border:3px dashed var(--primary-light); padding:25px; border-radius:20px; background: rgba(255,255,255,0.3);">
            <div style="font-size: 2.5rem; margin-bottom: 10px;">💺</div>
            Lütfen haritadan<br><strong style="color: var(--primary-deep); font-size: 1.2rem;">Koltuk Seçin.</strong>
        </div>`;

    container.appendChild(itContainer);
    container.appendChild(mapPart);
    container.appendChild(formPart);
}

function createInlineSeat(seat, tripObj) {
    const el = document.createElement('div');
    el.className = 'seat';
    el.textContent = seat.seat_number;
    if (!seat.is_available) {
        el.className += ' occupied ' + (seat.gender || '');
    } else {
        el.className += ' available';
        if (seat.gender_restriction) el.style.boxShadow = `inset 0 0 0 2px ${seat.gender_restriction==='female'?'#E91E63':'#2196F3'}`;
        el.onclick = (e) => {
            if (el.classList.contains('selected-female') || el.classList.contains('selected-male')) {
                deselectSeat(seat, tripObj);
            } else {
                showGenderBubble(el, seat, tripObj);
            }
        };
    }
    return el;
}

function showGenderBubble(seatEl, seat, tripObj) {
    if (activeGenderBubble) activeGenderBubble.remove();
    const bubble = document.createElement('div');
    bubble.className = 'gender-bubble';
    
    const fBtn = document.createElement('button'); fBtn.className = 'bubble-btn f'; fBtn.innerHTML = '👩';
    fBtn.disabled = (seat.gender_restriction === 'male');
    fBtn.onclick = (e) => { e.stopPropagation(); finalizeSelection(seatEl, seat, 'female', tripObj); };

    const mBtn = document.createElement('button'); mBtn.className = 'bubble-btn m'; mBtn.innerHTML = '👨';
    mBtn.disabled = (seat.gender_restriction === 'female');
    mBtn.onclick = (e) => { e.stopPropagation(); finalizeSelection(seatEl, seat, 'male', tripObj); };

    bubble.appendChild(fBtn); bubble.appendChild(mBtn);
    seatEl.appendChild(bubble);
    activeGenderBubble = bubble;
}

function finalizeSelection(seatEl, seat, gender, tripObj) {
    console.log("Finalizing selection for seat:", seat.seat_number, "Trip:", tripObj.id);
    
    // Aynı karttaki diğer seçimleri temizle
    const card = document.getElementById(`card-${tripObj.id}`);
    if (card) {
        card.querySelectorAll('.seat').forEach(s => s.classList.remove('selected-female', 'selected-male'));
    }

    seatEl.classList.add(gender === 'female' ? 'selected-female' : 'selected-male');
    window.selectedSeatsByTrip[tripObj.id] = { ...seat, chosenGender: gender };
    
    if (activeGenderBubble) { activeGenderBubble.remove(); activeGenderBubble = null; }
    
    // Formu render yap ve form alanına kaydır
    renderInlinePassengerForm(tripObj);
    const formSide = document.getElementById(`form-side-${tripObj.id}`);
    if (formSide) {
        setTimeout(() => {
            formSide.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

function deselectSeat(seat, tripObj) {
    delete window.selectedSeatsByTrip[tripObj.id];
    const card = document.getElementById(`card-${tripObj.id}`);
    if (card) {
        card.querySelectorAll('.seat').forEach(s => s.classList.remove('selected-female', 'selected-male'));
    }
    const side = document.getElementById(`form-side-${tripObj.id}`);
    if (side) {
        side.innerHTML = `<div class="info-msg" style="text-align:center; color:#999; margin-top:40px; border:2px dashed #eee; padding:20px; border-radius:10px;">Lütfen haritadan<br><strong>koltuk seçin.</strong></div>`;
    }
}

function renderInlinePassengerForm(tripObj) {
    const side = document.getElementById(`form-side-${tripObj.id}`);
    if (!side) {
        console.error("Form side container not found for ID:", tripObj.id);
        return;
    }
    const seat = window.selectedSeatsByTrip[tripObj.id];
    if (!seat) return;

    console.log("Rendering passenger form for seat:", seat.seat_number);

    side.innerHTML = `
        <div class="form-container" style="padding: 1.5rem; background: var(--bg-light); border-radius: 10px; border: 1px solid var(--border-light); animation: fadeIn 0.4s ease;">
            <h3 style="margin-bottom: 20px; color: var(--primary-darker); border-bottom: 1px dashed var(--border-light); padding-bottom: 10px;">Yolcu Bilgileri (Koltuk: ${seat.seat_number})</h3>
            <div class="form-group">
                <label>Ad Soyad</label>
                <input type="text" id="inline-name-${tripObj.id}" placeholder="Örn: Ahmet Yılmaz" required>
            </div>
            <div class="form-row-payment" style="display: flex; gap: 1rem;">
                <div class="form-group" style="flex: 1;">
                    <label>TC Kimlik No</label>
                    <input type="text" id="inline-tc-${tripObj.id}" placeholder="11 Hane" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '')" required>
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Telefon</label>
                    <input type="text" id="inline-phone-${tripObj.id}" placeholder="05XXXXXXXXX" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '')" required>
                </div>
            </div>
            <div style="margin: 15px 0; padding: 10px; background: white; border-radius: 8px; border: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-weight: 600;">Cinsiyet:</span>
                <strong style="color: ${seat.chosenGender==='female'?'#AD1457':'#1976D2'}; background: ${seat.chosenGender==='female'?'#FCE4EC':'#E3F2FD'}; padding: 4px 12px; border-radius: 15px; font-size: 0.85rem;">
                    ${seat.chosenGender==='female'?'KADIN':'ERKEK'}
                </strong>
            </div>
            <button class="confirm-btn" onclick="onaylaVeOdeme('${tripObj.id}')" style="margin-top: 10px;">
                ONAYLAYIP ÖDEMEYE GEÇ
            </button>
        </div>
    `;
    
    // Otomatik doldurma
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.full_name) document.getElementById(`inline-name-${tripObj.id}`).value = user.full_name;
        if (user.tc_no) document.getElementById(`inline-tc-${tripObj.id}`).value = user.tc_no;
        if (user.phone) document.getElementById(`inline-phone-${tripObj.id}`).value = user.phone;
    } catch(e) {}
}

function onaylaVeOdeme(tripId) {
    const tripObj = window.tripsStore[tripId];
    const seat = window.selectedSeatsByTrip[tripId];
    if (!seat) return;

    const name = document.getElementById(`inline-name-${tripId}`).value.trim();
    const tc = document.getElementById(`inline-tc-${tripId}`).value;
    const phone = document.getElementById(`inline-phone-${tripId}`).value;

    const tcRegex = /^[0-9]{11}$/;
    const phoneRegex = /^[0-9]{11}$/;

    if (!name || name.length < 3) {
        showNotification('Lütfen geçerli bir ad soyad girin.', 'error');
        return;
    }
    
    if (!tcRegex.test(tc)) {
        showNotification('TC Kimlik Numarası tam 11 haneli ve sadece rakamlardan oluşmalıdır.', 'error');
        return;
    }

    if (!phoneRegex.test(phone)) {
        showNotification('Telefon numarası tam 11 haneli ve sadece rakamlardan oluşmalıdır.', 'error');
        return;
    }

    selectedTrip = { ...tripObj, price: seat.price_multiplier ? tripObj.price * seat.price_multiplier : tripObj.price };
    currentPassengers = [{ full_name: name, tc_no: tc, gender: seat.chosenGender, seat_number: seat.seat_number }];

    showPaymentSummary();
    document.getElementById('paymentModal').style.display = 'block';
}

function showPaymentSummary() {
    const details = document.getElementById('paymentDetails');
    details.innerHTML = `
        <div class="summary-card">
            <p><strong>Firma/Havayolu:</strong> ${selectedTrip.company || selectedTrip.airline}</p>
            <p><strong>Güzergah:</strong> ${selectedTrip.from_city || selectedTrip.from_airport} → ${selectedTrip.to_city || selectedTrip.to_airport}</p>
            <p><strong>Koltuk:</strong> ${currentPassengers[0].seat_number} (${currentPassengers[0].gender === 'female' ? 'Kadın' : 'Erkek'})</p>
            <p><strong>Yolcu:</strong> ${currentPassengers[0].full_name}</p>
            <hr>
            <p class="total-price">Toplam: <span>${selectedTrip.price} TL</span></p>
        </div>
    `;
}