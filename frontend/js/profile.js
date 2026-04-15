// User Service Integration - Profile Management

async function loadProfile() {
    const token = localStorage.getItem('token');
    
    // Güvenli fallback (Mock Mode) - Backend hazır değilse patlamasın
    let user = JSON.parse(localStorage.getItem('user') || '{"full_name": "Demo Kullanıcı", "email": "demo@bilet.com", "phone": "05555555555"}');
    
    try {
        if (token) {
            const userResponse = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (userResponse.ok) {
                user = await userResponse.json();
            }
        }
    } catch(e) {}

    // My Bookings'i local storage'dan çek
    const bookings = JSON.parse(localStorage.getItem('my_bookings') || '[]');
    
    displayProfile(user, bookings);
}

function displayProfile(user, bookings) {
    const profileSection = document.getElementById('profileSection');
    const resultsSection = document.getElementById('results');
    if(resultsSection) resultsSection.style.display = 'none';
    
    profileSection.style.display = 'block';
    profileSection.innerHTML = '';
    
    let html = `
        <div class="container" style="max-width: 800px; margin: 0 auto; animation: fadeIn 0.5s ease;">
            <h2 style="margin-bottom: 25px; color: var(--primary-darker); font-weight: 700; border-bottom: 2px solid var(--bg-dusty); padding-bottom: 10px;">Profil Bilgilerim</h2>
            
            <div class="profile-card" style="background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; border: 1px solid var(--border-light); display: flex; align-items: center; gap: 1.5rem; box-shadow: var(--shadow-soft);">
                <div class="company-logo" style="width: 70px; height: 70px; font-size: 1.8rem; background: var(--primary-dusty); color: white;">
                    ${(user.full_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                    <h3 style="margin: 0; color: var(--primary-darker); font-size: 1.4rem;">${user.full_name}</h3>
                    <p style="margin: 5px 0 0; color: var(--text-secondary); font-size: 0.95rem;">
                        📧 ${user.email} <br>
                        📱 ${user.phone}
                    </p>
                </div>
            </div>
            
            <h3 style="margin-bottom: 15px; color: var(--primary-darker); font-weight: 600;">Aktif & Geçmiş Biletlerim</h3>
    `;

    if (!bookings || bookings.length === 0) {
        html += `
            <div style="text-align: center; padding: 3rem; background: var(--bg-light); border-radius: 12px; border: 1px dashed var(--border-light);">
                <p style="color: var(--text-light); margin: 0;">Henüz kayıtlı bir biletiniz bulunmamaktadır.</p>
            </div>
        `;
    } else {
        html += '<div class="bookings-list" style="display: flex; flex-direction: column; gap: 1rem;">';
        bookings.slice().reverse().forEach((booking) => {
            const isCancelled = booking.status === 'İptal Edildi';
            const isSuspended = booking.status === 'Askıya Alındı';
            
            let statusColor = 'var(--success)';
            if (isCancelled) statusColor = 'var(--error)';
            if (isSuspended) statusColor = 'var(--warning)';
            
            html += `
                <div class="trip-card" style="opacity: ${isCancelled ? '0.6' : '1'}; padding: 1.2rem; border-left: 5px solid ${statusColor}; background: white;">
                    <div style="flex: 1;">
                        <div style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 4px;">PNR: ${booking.id}</div>
                        <h4 style="margin: 0; color: var(--primary-darker); font-size: 1.1rem;">${booking.from_location} ➞ ${booking.to_location}</h4>
                        <p style="margin: 5px 0 0; font-size: 0.85rem; color: var(--text-secondary);">${booking.date} • ${booking.company}</p>
                        <p style="margin: 5px 0 0; font-size: 0.85rem; font-weight: 600; color: var(--primary-dusty);">Koltuk: ${booking.seat_numbers}</p>
                    </div>
                    <div style="text-align: right; min-width: 120px;">
                        <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary-darker);">${booking.total_price} TL</div>
                        <div style="margin-top: 5px; font-size: 0.75rem; padding: 4px 10px; border-radius: 15px; display: inline-block; background: ${statusColor}; color: white; font-weight: 600;">
                            ${booking.status}
                        </div>
                        ${(!isCancelled && !isSuspended) ? `
                            <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                                <button onclick="suspendTicket('${booking.id}')" style="font-size: 0.7rem; padding: 5px 10px; border: 1px solid var(--warning); color: var(--warning); background: transparent; border-radius: 5px; cursor: pointer; font-weight: 600;">Askıya Al</button>
                                <button onclick="cancelTicket('${booking.id}')" style="font-size: 0.7rem; padding: 5px 10px; border: 1px solid var(--error); color: var(--error); background: transparent; border-radius: 5px; cursor: pointer; font-weight: 600;">İptal Et</button>
                            </div>
                        ` : ''}
                        ${isSuspended ? `
                            <div style="margin-top: 10px;">
                                <button onclick="reactivateTicket('${booking.id}')" style="font-size: 0.75rem; padding: 6px 12px; background: var(--primary-dusty); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">Aktifleştir</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div>';
    profileSection.innerHTML = html;
    profileSection.scrollIntoView({ behavior: 'smooth' });
}

function updateTicketStatus(id, newStatus) {
    let bookings = JSON.parse(localStorage.getItem('my_bookings') || '[]');
    const index = bookings.findIndex(b => b.id === id);
    if (index > -1) {
        bookings[index].status = newStatus;
        localStorage.setItem('my_bookings', JSON.stringify(bookings));
        
        // Refresh UI
        const profileSection = document.getElementById('profileSection');
        const scrollPos = window.scrollY; // Mevcut scrollu kaydet
        loadProfile().then(() => {
            window.scrollTo(0, scrollPos); // Geri yerine koy
        });
        
        let msg = newStatus === 'İptal Edildi' ? 'Bilet başarıyla iptal edildi.' : (newStatus === 'Askıya Alındı' ? 'Biletiniz askıya alındı (açığa alındı).' : 'Biletiniz tekrar aktif!');
        showNotification(msg, newStatus === 'İptal Edildi' ? 'error' : 'success');
    }
}

function cancelTicket(id) {
    if (confirm("Bu bileti iptal etmek istediğinize emin misiniz? (Para iadesi yapılacaktır)")) {
        updateTicketStatus(id, 'İptal Edildi');
    }
}

function suspendTicket(id) {
    if (confirm("Bileti açığa (askıya) almak istiyor musunuz? İleride başka bir sefer için kullanabilirsiniz.")) {
        updateTicketStatus(id, 'Askıya Alındı');
    }
}

function reactivateTicket(id) {
    updateTicketStatus(id, 'Aktif');
}