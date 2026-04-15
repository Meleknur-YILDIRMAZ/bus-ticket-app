// Auth Service Integration
const API_URL = '/api/auth';

// FastAPI'nin döndürdüğü detail formatını Turkçe mesaja çevir
function formatApiError(detail, defaultMsg) {
    if (!detail) return defaultMsg;
    
    // Eğer detail zaten bir string ise
    if (typeof detail === 'string') {
        const map = {
            'Email already registered':          'Bu e-posta adresi zaten kayıtlı',
            'TC Kimlik No already registered':    'Bu TC Kimlik No zaten kayıtlı',
            'Incorrect email or password':        'E-posta veya şifre hatalı',
            'Not authenticated':                  'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
        };
        return map[detail] || detail;
    }
    
    // Eğer detail bir array ise (FastAPI Validation Error)
    if (Array.isArray(detail)) {
        const msgs = detail.map(e => {
            const field = e.loc ? e.loc[e.loc.length - 1] : '';
            const fieldMap = { full_name:'Ad Soyad', email:'E-posta', phone:'Telefon', tc_no:'TC Kimlik No', password:'Şifre' };
            const turkish = fieldMap[field] || field;
            // e.msg bazen "[object Object]" dönebilir, garantiye alalım
            const msgStr = typeof e.msg === 'object' ? JSON.stringify(e.msg) : e.msg;
            return turkish ? `${turkish}: ${msgStr}` : msgStr;
        });
        return msgs.join(' | ');
    }

    // Eğer detail bir nesne ise
    if (typeof detail === 'object') {
        return detail.msg || detail.message || JSON.stringify(detail);
    }
    
    return String(detail) || defaultMsg;
}

// ──────────────────────────────────────────────
// Sayfa Yönetimi
// ──────────────────────────────────────────────
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('loginLink').style.display = 'none';
        document.getElementById('logoutLink').style.display = 'block';
    } else {
        document.getElementById('loginLink').style.display = 'block';
        document.getElementById('logoutLink').style.display = 'none';
    }
}

function showPage(page) {
    if (page === 'login') {
        openModal('loginModal');
    } else if (page === 'profile') {
        const token = localStorage.getItem('token');
        if (!token) {
            openModal('loginModal');
            return;
        }
        loadProfile();
    } else if (page === 'search') {
        const profileSec = document.getElementById('profileSection');
        const resultsSec = document.getElementById('results');
        if(profileSec) profileSec.style.display = 'none';
        if(resultsSec) resultsSec.style.display = 'none';
        window.scrollTo({ top: document.querySelector('.hero').offsetTop, behavior: 'smooth' });
    }
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function showRegister() {
    closeModal('loginModal');
    openModal('registerModal');
    clearForm('registerForm');
}

// ──────────────────────────────────────────────
// Numara Alanları — Harf Engelleme (Anlık)
// ──────────────────────────────────────────────
function onlyNumbers(e) {
    // Klavye tuşu: rakam, Backspace, Delete, Tab, Arrow izin ver
    const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return; // Ctrl+C, Ctrl+V vb.
    if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        shake(e.target);
    }
}

function shake(el) {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake 0.3s ease';
    el.style.borderColor = '#C98B8B';
    setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 400);
}

// Yapıştırma sırasında da harf temizle
function pasteOnlyNumbers(e) {
    setTimeout(() => {
        e.target.value = e.target.value.replace(/\D/g, '');
    }, 0);
}

// ──────────────────────────────────────────────
// GİRİŞ YAP
// ──────────────────────────────────────────────
async function login() {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Frontend validasyon
    if (!email || !isValidEmail(email)) {
        showFieldError('loginEmail', 'Geçerli bir e-posta adresi girin');
        return;
    }
    if (!password) {
        showFieldError('loginPassword', 'Şifre boş olamaz');
        return;
    }

    setButtonLoading('loginBtn', true);

    try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        // JSON parse etmeyi dene, başarısız olursa text olarak al
        let data;
        const text = await response.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { detail: text || 'Sunucu hatası oluştu' };
        }

        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            closeModal('loginModal');
            checkAuth();
            clearForm('loginForm');
            showNotification('✓ Giriş başarılı! Hoş geldiniz.', 'success');
        } else {
            console.error('Login Error:', data);
            const msg = formatApiError(data.detail, 'Giriş başarısız');
            showNotification('✗ ' + msg, 'error');
            shake(document.getElementById('loginPassword'));
        }
    } catch (error) {
        console.error('Login Network Error:', error);
        showNotification('✗ Sunucuya bağlanılamadı. Lütfen ağınızı kontrol edin.', 'error');
    } finally {
        setButtonLoading('loginBtn', false);
    }
}

// ──────────────────────────────────────────────
// KAYIT OL
// ──────────────────────────────────────────────
async function register() {
    const name            = document.getElementById('regName').value.trim();
    const email           = document.getElementById('regEmail').value.trim();
    const phone           = document.getElementById('regPhone').value.trim();
    const tc              = document.getElementById('regTC') ? document.getElementById('regTC').value.trim() : null;
    const password        = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;

    // ── Validasyonlar ──
    if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{2,50}$/.test(name)) {
        showFieldError('regName', 'Ad soyad sadece harf içermeli (2-50 karakter)');
        return;
    }

    if (!isValidEmail(email)) {
        showFieldError('regEmail', 'Geçerli bir e-posta adresi girin');
        return;
    }

    if (!/^\d{11}$/.test(phone)) {
        showFieldError('regPhone', 'Telefon 11 haneli rakam olmalı (05XXXXXXXXX)');
        return;
    }

    if (phone[0] !== '0' || phone[1] !== '5') {
        showFieldError('regPhone', 'Telefon 05 ile başlamalı (05XXXXXXXXX)');
        return;
    }

    // TC: girilmişse sadece 11 rakam olmalı
    const tcEl = document.getElementById('regTC');
    let tcVal = tcEl ? tcEl.value.trim() : '';
    
    if (tcVal.length > 0) {
        // Harfleri temizle
        if (/\D/.test(tcVal)) {
            tcVal = tcVal.replace(/\D/g, '');
            tcEl.value = tcVal;
        }
        
        if (tcVal.length !== 11) {
            showFieldError('regTC', 'TC Kimlik No tam olarak 11 hane olmalıdır');
            return;
        }
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+{};:,<.>/?\\[\]|~`])[A-Za-z\d!@#$%^&*()\-_=+{};:,<.>/?\\[\]|~`]{8,}$/;
    if (!passwordRegex.test(password)) {
        showFieldError('regPassword', 'Şifre: min 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam, 1 özel karakter (!@#$%...)');
        return;
    }

    if (password !== passwordConfirm) {
        showFieldError('regPasswordConfirm', 'Şifreler eşleşmiyor');
        return;
    }

    setButtonLoading('registerBtn', true);

    try {
        const payload = {
            full_name: name,
            email:     email,
            phone:     phone,
            password:  password,
        };
        if (tc) payload.tc_no = tc;

        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // JSON parse etmeyi dene, başarısız olursa text olarak al
        let data;
        const text = await response.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { detail: text || 'Sunucu hatası oluştu' };
        }

        if (response.ok) {
            showNotification('✓ Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
            closeModal('registerModal');
            clearForm('registerForm');
            openModal('loginModal');
        } else {
            console.error('Register Error:', data);
            const msg = formatApiError(data.detail, 'Kayıt başarısız');
            showNotification('✗ ' + msg, 'error');
        }
    } catch (error) {
        console.error('Register Network Error:', error);
        showNotification('✗ Sunucuya bağlanılamadı. Lütfen ağınızı kontrol edin.', 'error');
    } finally {
        setButtonLoading('registerBtn', false);
    }
}

// ──────────────────────────────────────────────
// ÇIKIŞ
// ──────────────────────────────────────────────
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    checkAuth();
    showNotification('✓ Çıkış yapıldı. Görüşmek üzere!', 'success');
}

// ──────────────────────────────────────────────
// MODAL / FORM YARDIMCILARI
// ──────────────────────────────────────────────
function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.style.display = 'none';
}

function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
    // Hata mesajlarını temizle
    form && form.querySelectorAll('.field-error').forEach(el => el.remove());
    form && form.querySelectorAll('input, select').forEach(el => {
        el.style.borderColor = '';
    });
}

function setButtonLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Lütfen bekleyin...' : btn.dataset.label;
}

// ──────────────────────────────────────────────
// ALAN HATA GÖSTERME
// ──────────────────────────────────────────────
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Önceki hatayı kaldır
    const prev = field.parentNode.querySelector('.field-error');
    if (prev) prev.remove();

    field.style.borderColor = '#C98B8B';
    field.style.boxShadow = '0 0 0 3px rgba(201,139,139,0.2)';
    field.focus();

    const errEl = document.createElement('div');
    errEl.className = 'field-error';
    errEl.style.cssText = 'color:#C98B8B;font-size:0.78rem;margin-top:4px;';
    errEl.textContent = message;
    field.parentNode.appendChild(errEl);

    // Hata sınırı koy ve temizle
    field.addEventListener('input', function clear() {
        field.style.borderColor = '';
        field.style.boxShadow = '';
        errEl.remove();
        field.removeEventListener('input', clear);
    }, { once: true });
}

// ──────────────────────────────────────────────
// BİLDİRİM
// ──────────────────────────────────────────────
function showNotification(message, type) {
    console.log(`Notification [${type}]:`, message);
    
    // EĞER mesaj bir nesne ise, [object Object] yazmasın diye stringe çevir
    let finalMessage = message;
    if (typeof message === 'object' && message !== null) {
        finalMessage = message.detail || message.msg || JSON.stringify(message);
    }
    // "✗ [object Object]" durumunu garanti altına al
    if (String(finalMessage).includes('[object Object]')) {
        finalMessage = 'Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.';
    }

    // Önceki bildirimleri kaldır
    document.querySelectorAll('.notif-toast').forEach(n => n.remove());

    const notif = document.createElement('div');
    notif.className = 'notif-toast';
    notif.textContent = finalMessage;
    notif.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        color: white;
        font-weight: 500;
        font-family: 'Poppins', sans-serif;
        font-size: 0.9rem;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        max-width: 340px;
        background: ${type === 'success'
            ? 'linear-gradient(135deg, #8FA68F, #6B8C6B)'
            : 'linear-gradient(135deg, #C98B8B, #A86060)'};
    `;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 5000); // 5 saniye kalsın
}

// ──────────────────────────────────────────────
// YARDIMCI FONKSİYONLAR
// ──────────────────────────────────────────────
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Dışarı tıklayınca kapat
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// ──────────────────────────────────────────────
// BAŞLAT
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupNumericFields();
    setupButtonLabels();
});

function setupButtonLabels() {
    // Buton etiketlerini data-label'a kaydet (loading state için)
    ['loginBtn', 'registerBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.dataset.label = btn.textContent;
    });
}

function setupNumericFields() {
    // TC alanları: sadece rakam
    const numericFields = [
        'regPhone', 'regTC',          // kayıt
        'pTC', 'pPhone',              // yolcu bilgileri
        'cardNumber', 'cardCVV',      // ödeme
    ];

    numericFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', onlyNumbers);
            el.addEventListener('paste', pasteOnlyNumbers);
            // ANLIK TEMİZLEME (Garanti çözüm)
            el.addEventListener('input', function() {
                const start = this.selectionStart;
                const prevLength = this.value.length;
                this.value = this.value.replace(/\D/g, '');
                
                // Kursör pozisyonunu koru
                if (this.value.length < prevLength) {
                    this.setSelectionRange(start - 1, start - 1);
                }
            });
        }
    });

    // Telefon: maks 11 hane
    ['regPhone', 'pPhone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '').substring(0, 11);
            });
        }
    });

    // TC: maks 11 hane
    ['regTC', 'pTC'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '').substring(0, 11);
            });
        }
    });
}