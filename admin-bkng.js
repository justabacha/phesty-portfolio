const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentViewDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    fetchBookings();
    
    // Month Navigation
    document.getElementById('prevMonth').onclick = () => {
        currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        fetchBookings();
    };
    document.getElementById('nextMonth').onclick = () => {
        currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        fetchBookings();
    };
});

async function fetchBookings() {
    const { data, error } = await _supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) return console.error("DB Error:", error);

    const viewMonth = currentViewDate.getMonth();
    const viewYear = currentViewDate.getFullYear();

    // Filter confirmed bookings for the calendar dots/colors
    const confirmedForMonth = data.filter(b => {
        const bDate = new Date(b.booking_date);
        return b.status === 'confirmed' && 
               bDate.getMonth() === viewMonth && 
               bDate.getFullYear() === viewYear;
    });

    renderCalendar(confirmedForMonth, viewMonth, viewYear);

    // Clear Lists
    const lists = ['pendingList', 'approvedList', 'declinedList', 'completedList', 'archiveList'];
    lists.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = ""; });

    // Build UI
    data.forEach(booking => {
        if (booking.status === 'completed') {
            renderCompletedRow(booking);
        } else {
            const card = createCard(booking);
            if (booking.status === 'pending') document.getElementById('pendingList').appendChild(card);
            else if (booking.status === 'confirmed') document.getElementById('approvedList').appendChild(card);
            else if (booking.status === 'declined') document.getElementById('declinedList').appendChild(card);
            else if (booking.status === 'archived') document.getElementById('archiveList').appendChild(card);
        }
    });
}

function renderCalendar(confirmed, month, year) {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('monthDisplay');
    
    const tempDate = new Date(year, month, 1);
    monthLabel.innerText = tempDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Map busy days to their dates for easy checking
    const busyDays = confirmed.map(b => parseInt(b.booking_date.split('-')[2]));

    grid.innerHTML = "";
    
    // Monday start shift (Standard ISO)
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));
    
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = "cal-cell";
        
        // --- COLOUR BOOKING LOGIC ---
        if (busyDays.includes(d)) {
            cell.classList.add('busy'); // This triggers your CSS color for booked slots
        }
        
        // Highlight Today
        if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add('today');
        }

        cell.textContent = d;
        grid.appendChild(cell);
    }
}

function createCard(b) {
    const template = document.getElementById('cardTemplate');
    const clone = template.content.cloneNode(true);
    const cardDiv = clone.querySelector('.booking-card');

    cardDiv.classList.add(b.status);
    cardDiv.querySelector('.client-name').textContent = b.client_name;
    cardDiv.querySelector('.request-date').textContent = `${b.booking_date} @ ${b.booking_time}`;
    
    cardDiv.querySelector('.det-phone').textContent = b.client_phone;
    cardDiv.querySelector('.det-time').textContent = b.booking_time;
    cardDiv.querySelector('.purpose-text').textContent = b.purpose || "No message provided.";

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
    } else if (b.status === 'declined') {
        actions.innerHTML = `<button class="btn-wa">WHATSAPP</button><button class="btn-purge">PURGE</button>`;
        actions.querySelector('.btn-wa').onclick = () => openWA(b);
        actions.querySelector('.btn-purge').onclick = () => deleteEntry(b.id);
    } else if (b.status === 'archived') {
        actions.innerHTML = `<button class="btn-purge">DELETE</button>`;
        actions.querySelector('.btn-purge').onclick = () => deleteEntry(b.id);
    }

    return clone;
}

function renderCompletedRow(b) {
    const tbody = document.getElementById('completedList');
    if(!tbody) return;
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${b.client_name}</td>
        <td>${b.client_phone}</td>
        <td>${b.booking_date}</td>
        <td><button class="arch-btn" style="background: #333; color: #ff4d4d; border: 1px solid #ff4d4d44; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">ARCHIVE</button></td>
    `;
    row.querySelector('.arch-btn').onclick = () => updateStatus(b.id, 'archived');
    tbody.appendChild(row);
}

async function updateStatus(id, newStatus) {
    const { error } = await _supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    if (!error) fetchBookings();
    else alert("Error: " + error.message);
}

async function deleteEntry(id) {
    if (!confirm("Purge this record?")) return;
    const { error } = await _supabase.from('bookings').delete().eq('id', id);
    if (!error) fetchBookings();
}

function openWA(b) {
    const phone = b.client_phone.replace(/\D/g, '');
    let msg = b.status === 'declined' 
        ? `Hey ${b.client_name}, Phestone here. I'm fully booked for that slot, sorry!` 
        : `Yo ${b.client_name}, Phestone here. Your session for ${b.booking_date} is LOCKED IN!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}