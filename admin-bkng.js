const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    fetchBookings();
    
    // Immortal Global Listener
    document.addEventListener('click', async (e) => {
        const btn = e.target;
        const id = btn.dataset.id;
        
        if (btn.classList.contains('btn-confirm')) await updateStatus(id, 'confirmed');
        if (btn.classList.contains('btn-delete')) await updateStatus(id, 'declined');
        if (btn.classList.contains('btn-purge')) {
            if(confirm("Purge forever?")) await deleteEntry(id);
        }
        if (btn.classList.contains('btn-wa')) {
            openWA(btn.dataset.phone, btn.dataset.name, btn.dataset.status);
        }
    });
});

async function fetchBookings() {
    const { data, error } = await _supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) return console.error("DB Error:", error);

    renderCalendar(data.filter(b => b.status === 'confirmed'));
    
    // Reset lists
    const containers = {
        pending: document.getElementById('pendingList'),
        confirmed: document.getElementById('approvedList'),
        declined: document.getElementById('declinedList')
    };
    
    Object.values(containers).forEach(c => c.innerHTML = "");

    data.forEach(booking => {
        const card = buildCard(booking);
        const target = booking.status === 'confirmed' ? 'confirmed' : booking.status;
        containers[target].appendChild(card);
    });
}

function buildCard(b) {
    const template = document.getElementById('bookingCardTemplate');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.booking-card');

    card.classList.add(b.status);
    card.querySelector('.client-name').textContent = b.client_name;
    card.querySelector('.request-date').textContent = `${b.booking_date} @ ${b.booking_time}`;
    card.querySelector('.purpose-text').textContent = `"${b.purpose || 'No message'}"`;

    // Toggle logic
    card.querySelector('.card-main').onclick = () => card.classList.toggle('active');

    const actions = card.querySelector('.ledger-actions');
    if (b.status === 'pending') {
        actions.innerHTML = `
            <button class="btn-confirm" data-id="${b.id}">APPROVE</button>
            <button class="btn-delete" data-id="${b.id}">DECLINE</button>
        `;
    } else {
        actions.innerHTML = `
            <button class="btn-wa" data-phone="${b.client_phone}" data-name="${b.client_name}" data-status="${b.status}">WHATSAPP</button>
            <button class="btn-purge" data-id="${b.id}">PURGE</button>
        `;
    }
    return clone;
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
    // Align Mon-Sun (JS 0 is Sun, we want Mon start)
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));
    
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = `cal-cell ${busyDays.includes(day) ? 'busy' : ''}`;
        cell.textContent = day;
        grid.appendChild(cell);
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
    const msg = status === 'confirmed' ? `Yo ${name}, Phestone here. Your session is LOCKED IN!` : `Hey ${name}, Phestone here. Can't make that slot, sorry!`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}