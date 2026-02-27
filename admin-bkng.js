const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', fetchBookings);

async function fetchBookings() {
    // Sorting by created_at DESC so the newest request is always on top
    const { data, error } = await _supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    renderCommits(data.filter(b => b.status === 'confirmed'));
    renderLedger(data);
}

function renderCommits(confirmed) {
    const container = document.getElementById('bookingLedger');
    let commitsHTML = '';

    if (confirmed.length > 0) {
        // Only showing the most critical info for the "Commits" layer
        commitsHTML = `
            <div class="busy-days-section">
                <span class="info-label" style="margin-left:5px; margin-bottom:10px;">Locked Sessions (Commits)</span>
                ${confirmed.map(b => {
                    const day = b.booking_date.split('-')[2];
                    return `
                        <div class="commit-tag-vertical" onclick="toggleCard('${b.id}')">
                            <span class="commit-day">${day}th</span>
                            <span class="commit-client">${b.client_name}</span>
                            <span class="commit-time">@ ${b.booking_time}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin: 25px 0;">
        `;
    }
    window.commitsHeader = commitsHTML;
}

function renderLedger(bookings) {
    const container = document.getElementById('bookingLedger');
    if (!bookings || bookings.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#333; margin-top:50px;">No requests found.</p>`;
        return;
    }

    const cardsHTML = bookings.map(b => {
        let statusDisplay = "";
        let actionButtons = "";

        if (b.status === 'confirmed') {
            statusDisplay = `<span class="locked-status">✓ LOCKED IN</span>`;
            actionButtons = `<button class="btn-wa" onclick="sendWA('${b.client_phone}', '${b.client_name}', 'confirm', '${b.booking_date}', '${b.booking_time}')">WHATSAPP CONFIRMATION</button>`;
        } else if (b.status === 'declined') {
            statusDisplay = `<span style="color:#ff4d4d; font-size:11px; font-weight:900;">✕ DECLINED</span>`;
            actionButtons = `<button class="btn-wa-decline" onclick="sendWA('${b.client_phone}', '${b.client_name}', 'decline')">SEND APOLOGY</button>`;
        } else {
            statusDisplay = `<span style="color:#07d2fa; font-size:11px; font-weight:900;">AWAITING REVIEW</span>`;
            actionButtons = `
                <button class="btn-confirm" onclick="updateStatus('${b.id}', 'confirmed')">APPROVE</button>
                <button class="btn-delete" onclick="updateStatus('${b.id}', 'declined')">DECLINE</button>
            `;
        }

        return `
        <div class="booking-card ${b.status}" id="card-${b.id}">
            <div class="card-main" onclick="toggleCard('${b.id}')">
                <div>
                    <span class="client-name">${b.client_name}</span>
                    <span class="request-date">${b.booking_date} @ ${b.booking_time}</span>
                </div>
                <span class="chevron">▼</span>
            </div>
            
            <div class="card-expand">
                <div class="expand-inner">
                    <span class="info-label">Status & Contact</span>
                    <div class="info-value">
                        ${statusDisplay} 
                        <div style="margin-top:8px;"><a href="tel:${b.client_phone}" style="color:#eee; text-decoration:none; font-size:13px;">${b.client_phone}</a></div>
                    </div>

                    <span class="info-label">Message/Purpose</span>
                    <p class="info-value" style="font-size:13px; line-height:1.5; color:#aaa;">${b.purpose}</p>

                    <div class="ledger-actions">
                        ${actionButtons}
                        ${b.status !== 'pending' ? `<button class="btn-purge" onclick="deleteBooking('${b.id}')">PURGE</button>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `}).join('');

    container.innerHTML = (window.commitsHeader || '') + 
                         `<span class="info-label" style="margin-left:5px; margin-bottom:10px; display:block;">Full Ledger History</span>` + 
                         cardsHTML;
}

async function updateStatus(id, status) {
    const { error } = await _supabase.from('bookings').update({ status: status }).eq('id', id);
    if (!error) fetchBookings();
}

function sendWA(phone, name, type, date, time) {
    let msg = "";
    if (type === 'confirm') {
        msg = `Yo ${name}, Phestone here. Your session for ${date} at ${time} is officially LOCKED IN. See you then!`;
    } else {
        msg = `Hello ${name}, thanks for reaching out. Unfortunately, Phestone is fully booked or unavailable for that slot. Apologies!`;
    }
    const cleanPhone = phone.replace('+', '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function toggleCard(id) {
    const card = document.getElementById(`card-${id}`);
    const wasActive = card.classList.contains('active');
    document.querySelectorAll('.booking-card').forEach(c => c.classList.remove('active'));
    if (!wasActive) card.classList.add('active');
}

async function deleteBooking(id) {
    if (!confirm("Permanently purge this record?")) return;
    const { error } = await _supabase.from('bookings').delete().eq('id', id);
    if (!error) fetchBookings();
}