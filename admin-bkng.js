const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', fetchBookings);

async function fetchBookings() {
    const { data, error } = await _supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);

    // Filter by month so Feb doesn't show in March
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JS is 0-indexed
    const currentYear = now.getFullYear();

    const currentMonthData = data.filter(b => {
        const bDate = new Date(b.booking_date);
        return (bDate.getMonth() + 1) === currentMonth && bDate.getFullYear() === currentYear;
    });

    renderCalendar(currentMonthData.filter(b => b.status === 'confirmed'));

    // Clear Lists
    const lists = ['pendingList', 'approvedList', 'declinedList', 'completedList'];
    lists.forEach(id => document.getElementById(id).innerHTML = "");

    data.forEach(booking => {
        if (booking.status === 'completed') {
            renderCompletedRow(booking);
        } else {
            const card = createCard(booking);
            if (booking.status === 'pending') document.getElementById('pendingList').appendChild(card);
            else if (booking.status === 'confirmed') document.getElementById('approvedList').appendChild(card);
            else if (booking.status === 'declined') document.getElementById('declinedList').appendChild(card);
        }
    });
}

function createCard(b) {
    const template = document.getElementById('cardTemplate');
    const clone = template.content.cloneNode(true);
    const cardDiv = clone.querySelector('.booking-card');

    cardDiv.classList.add(b.status);
    cardDiv.querySelector('.client-name').textContent = b.client_name;
    cardDiv.querySelector('.request-date').textContent = b.booking_date;
    
    // Deep Details for Expansion
    cardDiv.querySelector('.det-phone').textContent = b.client_phone;
    cardDiv.querySelector('.det-time').textContent = b.booking_time;
    cardDiv.querySelector('.purpose-text').textContent = b.purpose || "No specific purpose provided.";

    cardDiv.querySelector('.card-main').onclick = () => cardDiv.classList.toggle('active');

    const actions = cardDiv.querySelector('.ledger-actions');
    
    if (b.status === 'pending') {
        actions.innerHTML = `<button class="btn-confirm">APPROVE</button><button class="btn-delete">DECLINE</button>`;
        actions.querySelector('.btn-confirm').onclick = () => updateStatus(b.id, 'confirmed');
        actions.querySelector('.btn-delete').onclick = () => updateStatus(b.id, 'declined');
    } else if (b.status === 'confirmed') {
        actions.innerHTML = `<button class="btn-wa">WHATSAPP</button><button class="btn-confirm" style="background:#98fa9a; color:#000;">DONE</button>`;
        actions.querySelector('.btn-wa').onclick = () => openWA(b);
        actions.querySelector('.btn-confirm').onclick = () => updateStatus(b.id, 'completed');
    } else {
        actions.innerHTML = `<button class="btn-purge">PURGE</button>`;
        actions.querySelector('.btn-purge').onclick = () => deleteEntry(b.id);
    }

    return clone;
}

function renderCompletedRow(b) {
    const tbody = document.getElementById('completedList');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${b.client_name}</td>
        <td>${b.client_phone}</td>
        <td>${b.booking_date}</td>
        <td>
    <button onclick="deleteEntry('${b.id}')" 
            style="background: #333; color: #ff4d4d; border: 1px solid #ff4d4d44; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">
        ARCHIVE
    </button>
</td>
    `;
    tbody.appendChild(row);
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
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));
    
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = "cal-cell";
        if (busyDays.includes(d)) cell.classList.add('busy');
        if (d === now.getDate()) cell.classList.add('today'); // HIGHLIGHT TODAY
        cell.textContent = d;
        grid.appendChild(cell);
    }
}

async function updateStatus(id, newStatus) {
    const { data, error } = await _supabase.from('bookings').update({ status: newStatus }).eq('id', id).select();
    if (!error) fetchBookings();
    else alert("Update failed: " + error.message);
}

async function deleteEntry(id) {
    if (!confirm("Delete this permanently?")) return;
    const { error } = await _supabase.from('bookings').delete().eq('id', id);
    if (!error) fetchBookings();
}

function openWA(b) {
    const phone = b.client_phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=Hi ${b.client_name}, your session is set!`, '_blank');
}