const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    fetchBookings();
    
    // GLOBAL CLICK LISTENER: This makes buttons "immortal"
    document.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.getAttribute('data-id');
        
        if (target.classList.contains('btn-confirm')) {
            await updateStatus(id, 'confirmed');
        } else if (target.classList.contains('btn-delete')) {
            await updateStatus(id, 'declined');
        } else if (target.classList.contains('btn-purge')) {
            if(confirm("Purge forever?")) await deleteEntry(id);
        } else if (target.classList.contains('btn-wa')) {
            const phone = target.getAttribute('data-phone');
            const name = target.getAttribute('data-name');
            const status = target.getAttribute('data-status');
            openWA(phone, name, status);
        }
    });
});

async function fetchBookings() {
    const { data, error } = await _supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) return;

    renderCalendar(data.filter(b => b.status === 'confirmed'));
    
    // Clear and Refill using template strings (easier to read/edit)
    document.getElementById('pendingList').innerHTML = renderList(data.filter(b => b.status === 'pending'), 'pending');
    document.getElementById('approvedList').innerHTML = renderList(data.filter(b => b.status === 'confirmed'), 'approved');
    document.getElementById('declinedList').innerHTML = renderList(data.filter(b => b.status === 'declined'), 'declined');
}

function renderList(list, type) {
    if (list.length === 0) return '<p class="empty-msg">Empty</p>';
    return list.map(b => `
        <div class="booking-card ${b.status}">
            <div class="card-main" onclick="this.parentElement.classList.toggle('active')">
                <div>
                    <span class="client-name">${b.client_name}</span>
                    <span class="request-date">${b.booking_date} @ ${b.booking_time}</span>
                </div>
                <span class="chevron">▼</span>
            </div>
            <div class="card-expand">
                <div class="expand-inner">
                    <p class="purpose-text">"${b.purpose || 'No message'}"</p>
                    <div class="ledger-actions">
                        ${type === 'pending' ? `
                            <button class="btn-confirm" data-id="${b.id}">APPROVE</button>
                            <button class="btn-delete" data-id="${b.id}">DECLINE</button>
                        ` : `
                            <button class="btn-wa" data-phone="${b.client_phone}" data-name="${b.client_name}" data-status="${b.status}">WHATSAPP</button>
                            <button class="btn-purge" data-id="${b.id}">PURGE</button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCalendar(confirmed) {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('monthDisplay');
    const now = new Date();
    monthLabel.innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const busyDays = confirmed.map(b => parseInt(b.booking_date.split('-')[2]));

    grid.innerHTML = "";
    // Offset for start of month
    for (let i = 1; i < (firstDay || 7); i++) grid.innerHTML += `<div></div>`;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const isBusy = busyDays.includes(day);
        grid.innerHTML += `<div class="cal-cell ${isBusy ? 'busy' : ''}">${day}</div>`;
    }
}

async function updateStatus(id, status) {
    await _supabase.from('bookings').update({ status }).eq('id', id);
    fetchBookings();
}

async function deleteEntry(id) {
    await _supabase.from('bookings').delete().eq('id', id);
    fetchBookings();
}

function openWA(phone, name, status) {
    const msg = status === 'confirmed' ? `Yo ${name}, Phestone here. Your session is LOCKED IN!` : `Hey ${name}, sorry I can't make that slot.`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}