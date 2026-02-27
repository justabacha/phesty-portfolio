const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. START THE ENGINE
document.addEventListener('DOMContentLoaded', () => {
    fetchBookings();
    setupRealtime(); // This is the magic for instant updates
});

// 2. REALTIME LISTENER (No Refresh Needed)
function setupRealtime() {
    _supabase
        .channel('schema-db-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'bookings' }, 
            (payload) => {
                console.log('Change received!', payload);
                fetchBookings(); // Automatically re-renders everything instantly
            }
        )
        .subscribe();
}

// 3. FETCH & SORT
async function fetchBookings() {
    const { data, error } = await _supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: true });

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    renderCommits(data.filter(b => b.status === 'confirmed'));
    renderLedger(data);
}

// 4. THE BUSY DAYS LAYER (Vertical List at Top)
function renderCommits(confirmed) {
    let commitsHTML = '';
    if (confirmed.length > 0) {
        commitsHTML = `
            <div class="busy-days-section">
                <span class="info-label" style="margin-left:5px; margin-bottom:10px;">Locked Sessions (Commits)</span>
                ${confirmed.map(b => {
                    const day = b.booking_date.split('-')[2];
                    return `
                        <div class="commit-tag-vertical">
                            <span class="commit-day">${day}th</span>
                            <span class="commit-client">${b.client_name}</span>
                            <span class="commit-time">@ ${b.booking_time}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin: 20px 0;">
            <span class="info-label" style="margin-left:5px; margin-bottom:10px;">Recent Requests</span>
        `;
    }
    window.commitsHeader = commitsHTML;
}

// 5. THE LEDGER RENDERER
function renderLedger(bookings) {
    const container = document.getElementById('bookingLedger');
    if (!bookings || bookings.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#333; margin-top:50px;">No requests found.</p>`;
        return;
    }

    const cardsHTML = bookings.map(b => {
        let statusDisplay = "";
        if(b.status === 'confirmed') statusDisplay = `<span class="locked-status">✓ LOCKED IN</span>`;
        else if(b.status === 'declined') statusDisplay = `<span style="color:#ff4d4d; font-size:11px; font-weight:900;">✕ DECLINED</span>`;
        else statusDisplay = `<span style="color:#07d2fa; font-size:11px; font-weight:900;">AWAITING REVIEW</span>`;

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
                    <span class="info-label">Contact & Status</span>
                    <div class="info-value">
                        <a href="tel:${b.client_phone}" style="color:#07d2fa; text-decoration:none; font-weight:800;">${b.client_phone}</a>
                        <div style="margin-top:5px;">${statusDisplay}</div>
                    </div>

                    <span class="info-label">Purpose of Session</span>
                    <p class="info-value" style="font-size:13px; line-height:1.5; color:#aaa;">${b.purpose}</p>

                    <div class="ledger-actions">
                        ${b.status === 'pending' ? `
                            <button class="btn-confirm" onclick="handleAction('${b.id}', 'confirmed', '${b.client_name}', '${b.client_phone}', '${b.booking_date}', '${b.booking_time}')">APPROVE</button>
                            <button class="btn-delete" onclick="handleAction('${b.id}', 'declined', '${b.client_name}', '${b.client_phone}')">DECLINE</button>
                        ` : `
                            <button class="btn-delete" style="flex:1; opacity:0.5;" onclick="deleteBooking('${b.id}')">PURGE RECORD</button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `}).join('');

    container.innerHTML = (window.commitsHeader || '') + cardsHTML;
}

// 6. ACTION HANDLER (Now with UI Priority & Delay)
async function handleAction(id, status, name, phone, date, time) {
    // Update DB first
    const { error } = await _supabase.from('bookings').update({ status: status }).eq('id', id);
    
    if (!error) {
        // UI REFRESHES INSTANTLY thanks to the Realtime listener above
        
        let msg = "";
        if (status === 'confirmed') {
            msg = `Yo ${name}, Phestone here. Your session for ${date} at ${time} is officially LOCKED IN. See you then!`;
        } else {
            msg = `Hello ${name}, thanks for reaching out. Unfortunately, Phestone is fully booked or unavailable for that slot. Apologies, let's link up another time!`;
        }
        
        // WAIT 1.5 SECONDS so you see the UI change to "LOCKED IN" before WhatsApp pops
        setTimeout(() => {
            const waLink = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(msg)}`;
            window.open(waLink, '_blank');
        }, 1500);

    } else {
        alert("Action failed. Check connection.");
    }
}

// 7. UTILS
function toggleCard(id) {
    const card = document.getElementById(`card-${id}`);
    const wasActive = card.classList.contains('active');
    document.querySelectorAll('.booking-card').forEach(c => c.classList.remove('active'));
    if (!wasActive) card.classList.add('active');
}

async function deleteBooking(id) {
    if (!confirm("Permanently purge this record?")) return;
    const { error } = await _supabase.from('bookings').delete().eq('id', id);
    // Realtime will handle the UI refresh
}