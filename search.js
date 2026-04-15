// Search Service Integration

// Turkish cities with airports
const airportCities = [
    { code: 'IST', city: 'İstanbul', airport: 'İstanbul Havalimanı', region: 'Marmara' },
    { code: 'SAW', city: 'İstanbul', airport: 'Sabiha Gökçen', region: 'Marmara' },
    { code: 'YEI', city: 'Bursa', airport: 'Yenişehir', region: 'Marmara' },
    { code: 'TEQ', city: 'Tekirdağ', airport: 'Çorlu', region: 'Marmara' },
    { code: 'ADB', city: 'İzmir', airport: 'Adnan Menderes', region: 'Ege' },
    { code: 'BJV', city: 'Muğla', airport: 'Milas-Bodrum', region: 'Ege' },
    { code: 'DLM', city: 'Muğla', airport: 'Dalaman', region: 'Ege' },
    { code: 'AYT', city: 'Antalya', airport: 'Antalya', region: 'Akdeniz' },
    { code: 'GZP', city: 'Antalya', airport: 'Gazipaşa', region: 'Akdeniz' },
    { code: 'ESB', city: 'Ankara', airport: 'Esenboğa', region: 'İç Anadolu' },
    { code: 'ASR', city: 'Kayseri', airport: 'Erkilet', region: 'İç Anadolu' },
    { code: 'KYA', city: 'Konya', airport: 'Konya', region: 'İç Anadolu' },
    { code: 'NAV', city: 'Nevşehir', airport: 'Kapadokya', region: 'İç Anadolu' },
    { code: 'TZX', city: 'Trabzon', airport: 'Trabzon', region: 'Karadeniz' },
    { code: 'SZF', city: 'Samsun', airport: 'Çarşamba', region: 'Karadeniz' },
    { code: 'ERZ', city: 'Erzurum', airport: 'Erzurum', region: 'Doğu Anadolu' },
    { code: 'VAN', city: 'Van', airport: 'Ferit Melen', region: 'Doğu Anadolu' },
    { code: 'DIY', city: 'Diyarbakır', airport: 'Diyarbakır', region: 'Güneydoğu' },
    { code: 'GZT', city: 'Gaziantep', airport: 'Gaziantep', region: 'Güneydoğu' }
];

const allCities = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
    'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale',
    'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum',
    'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta', 'Mersin',
    'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli',
    'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş', 'Nevşehir',
    'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Tekirdağ', 'Tokat',
    'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak', 'Van', 'Yozgat', 'Zonguldak'
];

function initializeSearchForms() {
    const busFrom = document.getElementById('busFrom');
    const busTo = document.getElementById('busTo');
    const flightFrom = document.getElementById('flightFrom');
    const flightTo = document.getElementById('flightTo');
    
    if (busFrom) {
        allCities.forEach(city => {
            busFrom.innerHTML += `<option value="${city}">${city}</option>`;
            busTo.innerHTML += `<option value="${city}">${city}</option>`;
        });
    }

    if (flightFrom) {
        airportCities.forEach(airport => {
            const option = `<option value="${airport.code}">${airport.city} - ${airport.airport} (${airport.code})</option>`;
            flightFrom.innerHTML += option;
            flightTo.innerHTML += option;
        });
    }

    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('busDate')) document.getElementById('busDate').min = today;
    if (document.getElementById('flightDate')) document.getElementById('flightDate').min = today;
}

function switchTab(type) {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.search-form');
    tabs.forEach(btn => btn.classList.remove('active'));
    forms.forEach(form => form.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        tabs.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(type)) {
                btn.classList.add('active');
            }
        });
    }
    document.getElementById(type + 'Search').classList.add('active');
}

function swapLocations(type) {
    const from = document.getElementById(type + 'From');
    const to = document.getElementById(type + 'To');
    if (from && to) {
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
    }
}

async function searchBus() {
    const from = document.getElementById('busFrom').value;
    const to = document.getElementById('busTo').value;
    const date = document.getElementById('busDate').value;
    const passengers = document.getElementById('busPassengers').value;

    if (!from || !to || !date) { showNotification('Lütfen tüm alanları doldurun', 'error'); return; }
    if (from === to) { showNotification('Nereden ve Nereye aynı olamaz', 'error'); return; }

    // ÖNEMLİ: Yeni aramadan önce results section'ını sıfırla
    resetResultsSection();

    showLoading();
    try {
        const response = await fetch(`/api/trip/bus/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&passengers=${passengers}`);
        const trips = await response.json();
        hideLoading();
        displayResults(trips, 'bus');
    } catch (error) {
        hideLoading();
        console.error("Bus Search Error:", error);
        showNotification('Arama hatası: ' + error.message, 'error');
    }
}

async function searchFlight() {
    const from = document.getElementById('flightFrom').value;
    const to = document.getElementById('flightTo').value;
    const date = document.getElementById('flightDate').value;
    const passengers = document.getElementById('flightPassengers').value;

    if (!from || !to || !date) { showNotification('Lütfen tüm alanları doldurun', 'error'); return; }
    if (from === to) { showNotification('Havalimanları aynı olamaz', 'error'); return; }

    // ÖNEMLİ: Yeni aramadan önce results section'ını sıfırla
    resetResultsSection();

    showLoading();
    try {
        const response = await fetch(`/api/flight/search?from=${from}&to=${to}&date=${date}&passengers=${passengers}`);
        const flights = await response.json();
        hideLoading();
        if (flights && flights.detail) {
            showNotification('Hata: ' + flights.detail, 'error');
            return;
        }
        displayResults(flights, 'flight');
    } catch (error) {
        hideLoading();
        console.error("Flight Search Error:", error);
        showNotification('Arama hatası: ' + error.message, 'error');
    }
}

/**
 * Bilet alındıktan sonra ya da yeni arama yapılmadan önce
 * results section'ını güvenli şekilde sıfırlar.
 * booking.js veya payment.js'den de çağrılabilir.
 */
function resetResultsSection() {
    let resultsSection = document.getElementById('results');
    let resultsList = document.getElementById('resultsList');

    // results section DOM'dan silindiyse yeniden oluştur
    if (!resultsSection) {
        resultsSection = document.createElement('section');
        resultsSection.id = 'results';
        resultsSection.className = 'results-section';
        resultsSection.style.display = 'none';
        resultsSection.innerHTML = `
            <div class="container">
                <h2>Bulunan Seferler</h2>
                <div id="resultsList" class="results-list"></div>
            </div>
        `;
        // Hero'nun hemen ardına ekle
        const hero = document.querySelector('.hero');
        if (hero && hero.nextSibling) {
            hero.parentNode.insertBefore(resultsSection, hero.nextSibling);
        } else {
            document.body.appendChild(resultsSection);
        }
        resultsList = document.getElementById('resultsList');
    }

    // resultsList DOM'dan silindiyse results içine yeniden ekle
    if (!resultsList) {
        const container = resultsSection.querySelector('.container');
        if (container) {
            resultsList = document.createElement('div');
            resultsList.id = 'resultsList';
            resultsList.className = 'results-list';
            container.appendChild(resultsList);
        }
    }

    // İçeriği temizle, gizle
    if (resultsList) resultsList.innerHTML = '';
    resultsSection.style.display = 'none';

    // Önceki seçim alanlarını temizle
    window.tripsStore = {};
}

function displayResults(items, type) {
    // Önce sıfırla / yoksa yeniden oluştur
    resetResultsSection();

    const resultsSection = document.getElementById('results');
    const resultsList = document.getElementById('resultsList');

    // Bu noktada her ikisi de kesinlikle var olmalı
    if (!resultsSection || !resultsList) {
        console.error('results veya resultsList oluşturulamadı!');
        return;
    }

    resultsSection.style.display = 'block';
    resultsList.innerHTML = '';
    window.tripsStore = {};

    if (!items || items.length === 0) {
        resultsList.innerHTML = '<p class="no-results">Uygun sefer bulunamadı.</p>';
        return;
    }

    items.forEach(item => {
        window.tripsStore[item.id] = item;
        const card = createTripCard(item, type);
        resultsList.appendChild(card);
    });

    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function createTripCard(item, type) {
    const card = document.createElement('div');
    card.className = 'trip-card';
    card.id = `card-${item.id}`;
    
    const isBus = type === 'bus';
    const logoPlaceholder = (isBus ? item.company : item.airline || 'TR').substring(0, 2);
    const companyName = isBus ? item.company : item.airline;
    const subInfo = isBus ? item.bus_type : item.flight_number || 'Uçuş';
    const duration = item.duration;
    const price = item.price;

    card.innerHTML = `
        <div class="trip-main-content">
            <div class="trip-info">
                <div class="trip-company">
                    <div class="company-logo">${logoPlaceholder}</div>
                    <div>
                        <div style="font-weight: 700; color: var(--primary-darker);">${companyName}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${subInfo}</div>
                    </div>
                </div>
                <div class="trip-time">
                    <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary-darker);">${item.departure_time}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${isBus ? item.from_city : item.from_airport}</div>
                </div>
                <div class="trip-duration">
                    <div style="font-size: 1rem; color: var(--primary-dusty);">${isBus ? '➞' : '✈'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-light);">${duration}</div>
                </div>
                <div class="trip-time">
                    <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary-darker);">${item.arrival_time}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${isBus ? item.to_city : item.to_airport}</div>
                </div>
            </div>
            <div class="trip-price">
                <div style="font-size: 1.4rem; font-weight: 700; color: var(--primary-darker);">${price} TL</div>
                <button class="select-btn" id="btn-${item.id}" onclick="toggleInlineSelection('${item.id}', '${type}')">Koltuk Seç</button>
            </div>
        </div>
        <div class="selection-area" id="selection-${item.id}" style="display: none;">
        </div>
    `;
    
    return card;
}

function showLoading() {
    if (document.getElementById('loadingOverlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `<div class="loading-content"><div class="spinner"></div><p>Seferler aranıyor...</p></div>`;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', initializeSearchForms);