const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', fetchBookings);

async function fetchBookings() {
    const { data, error } = await _supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: true });

    if (error) return;
    renderLedger(data);
}

function renderLedger(bookings) {
    const container = document.getElementById('bookingLedger');
    if (!bookings || bookings.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#333; margin-top:50px;">No requests found.</p>`;
        return;
    }

    container.innerHTML = bookings.map(b => `
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
                    <span class="info-label">Contact Number</span>
                    <div class="info-value">
                        <a href="tel:${b.client_phone}" style="color:#07d2fa; text-decoration:none; font-weight:800;">${b.client_phone}</a>
                    </div>

                    <span class="info-label">Purpose of Session</span>
                    <p class="info-value" style="font-size:13px; line-height:1.5; color:#aaa;">${b.purpose}</p>

                    <div class="ledger-actions">
                        ${b.status === 'pending' ? 
                            `<button class="btn-confirm" onclick="updateStatus('${b.id}', 'confirmed')">APPROVE REQUEST</button>` : 
                            `<span class="locked-status">✓ SESSION CONFIRMED</span>`
                        }
                        <button class="btn-delete" onclick="deleteBooking('${b.id}')">REMOVE</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleCard(id) {
    const card = document.getElementById(`card-${id}`);
    const isActive = card.classList.contains('active');
    
    // Close all cards first for that clean accordion feel
    document.querySelectorAll('.booking-card').forEach(c => c.classList.remove('active'));
    
    // If it wasn't active, open it
    if (!isActive) card.classList.add('active');
}

async function updateStatus(id, newStatus) {
    const { error } = await _supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    if (!error) fetchBookings();
}

async function deleteBooking(id) {
    if (!confirm("Permanently delete this request?")) return;
    const { error } = await _supabase.from('bookings').delete().eq('id', id);
    if (!error) fetchBookings();
}