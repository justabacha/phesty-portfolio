const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', fetchBookings);

async function fetchBookings() {
    // Fetching and sorting by most recent request first
    const { data, error } = await _supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Connection Error:", error);
        return;
    }

    const pending = data.filter(b => b.status === 'pending');
    const confirmed = data.filter(b => b.status === 'confirmed');
    const declined = data.filter(b => b.status === 'declined');

    renderAllSections(pending, confirmed, declined);
}

function renderAllSections(pending, confirmed, declined) {
    const container = document.getElementById('bookingLedger');
    
    container.innerHTML = `
        <div class="section-wrapper">
            <span class="info-label">? NEW REQUESTS (${pending.length})</span>
            ${pending.length > 0 ? pending.map(b => renderCard(b, 'pending')).join('') : '<p class="empty-msg">No new requests.</p>'}
        </div>

        <hr class="section-divider">

        <div class="section-wrapper">
            <span class="info-label">✓ LOCKED IN / COMMITS (${confirmed.length})</span>
            ${confirmed.length > 0 ? confirmed.map(b => renderCard(b, 'approved')).join('') : '<p class="empty-msg">No confirmed sessions.</p>'}
        </div>

        <hr class="section-divider">

        <div class="section-wrapper">
            <span class="info-label">✕ DECLINED HISTORY (${declined.length})</span>
            ${declined.length > 0 ? declined.map(b => renderCard(b, 'declined')).join('') : '<p class="empty-msg">No declined requests.</p>'}
        </div>
    `;
}

function renderCard(b, type) {
    let actionButtons = "";
    
    if (type === 'pending') {
        actionButtons = `
            <button class="btn-confirm" onclick="updateStatus('${b.id}', 'confirmed')">APPROVE</button>
            <button class="btn-delete" onclick="updateStatus('${b.id}', 'declined')">DECLINE</button>
        `;
    } else if (type === 'approved') {
        actionButtons = `
            <button class="btn-wa" onclick="openWA('${b.client_phone}', '${b.client_name}', 'confirm', '${b.booking_date}', '${b.booking_time}')">WHATSAPP LOUDER</button>
            <button class="btn-purge" onclick="deleteEntry('${b.id}')">PURGE</button>
        `;
    } else {
        actionButtons = `
            <button class="btn-wa-decline" onclick="openWA('${b.client_phone}', '${b.client_name}', 'decline')">SEND APOLOGY</button>
            <button class="btn-purge" onclick="deleteEntry('${b.id}')">PURGE</button>
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
                    <p class="purpose-text">"${b.purpose || 'No message provided'}"</p>
                    <div class="ledger-actions">${actionButtons}</div>
                </div>
            </div>
        </div>
    `;
}

// THE ENGINE: Updates Supabase & Refreshes UI
async function updateStatus(id, newStatus) {
    const { error } = await _supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id);

    if (!error) {
        fetchBookings(); // This refreshes the whole view instantly
    }
}

function openWA(phone, name, type, date, time) {
    let msg = "";
    if (type === 'confirm') {
        msg = `Yo ${name}, Phestone here. Your session for ${date} at ${time} is officially LOCKED IN. See you then!`;
    } else {
        msg = `Hello ${name}, Phestone here. Apologies, but I'm unable to take your request for this slot. Let's catch up later!`;
    }
    const cleanPhone = phone.replace(/\+/g, '').replace(/\s/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function toggleCard(id) {
    const card = document.getElementById(`card-${id}`);
    card.classList.toggle('active');
}

async function deleteEntry(id) {
    if (confirm("Purge this record forever?")) {
        await _supabase.from('bookings').delete().eq('id', id);
        fetchBookings();
    }
}