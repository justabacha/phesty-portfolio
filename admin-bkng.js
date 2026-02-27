const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', fetchBookings);

async function fetchBookings() {
    const { data, error } = await _supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error("Sync Error:", error);

    // Clear lists before re-filling
    document.getElementById('pendingList').innerHTML = "";
    document.getElementById('approvedList').innerHTML = "";
    document.getElementById('declinedList').innerHTML = "";

    renderCalendar(data.filter(b => b.status === 'confirmed'));

    data.forEach(booking => {
        const card = createCardElement(booking);
        if (booking.status === 'pending') {
            document.getElementById('pendingList').appendChild(card);
        } else if (booking.status === 'confirmed') {
            document.getElementById('approvedList').appendChild(card);
        } else {
            document.getElementById('declinedList').appendChild(card);
        }
    });
}

function createCardElement(b) {
    const div = document.createElement('div');
    div.className = `booking-card ${b.status}`;
    div.id = `card-${b.id}`;

    // Structure of the card
    div.innerHTML = `
        <div class="card-main">
            <div>
                <span class="client-name">${b.client_name}</span>
                <span class="request-date">${b.booking_date} @ ${b.booking_time}</span>
            </div>
            <span class="chevron">▼</span>
        </div>
        <div class="card-expand">
            <div class="expand-inner">
                <p class="purpose-text">"${b.purpose || 'No message'}"</p>
                <div class="ledger-actions" id="actions-${b.id}"></div>
            </div>
        </div>
    `;

    // Add Toggle Event
    div.querySelector('.card-main').onclick = () => div.classList.toggle('active');

    // Attach Buttons Manually (The Secret to why it won't be "silent")
    const actionContainer = div.querySelector(`#actions-${b.id}`);

    if (b.status === 'pending') {
        const appBtn = createBtn('APPROVE', 'btn-confirm', () => updateStatus(b.id, 'confirmed'));
        const decBtn = createBtn('DECLINE', 'btn-delete', () => updateStatus(b.id, 'declined'));
        actionContainer.append(appBtn, decBtn);
    } else {
        const waBtn = createBtn('WHATSAPP', 'btn-wa', () => openWA(b));
        const purgeBtn = createBtn('PURGE', 'btn-purge', () => deleteEntry(b.id));
        actionContainer.append(waBtn, purgeBtn);
    }

    return div;
}

// HELPER: Create buttons with live events
function createBtn(text, className, fn) {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.className = className;
    btn.onclick = (e) => { e.stopPropagation(); fn(); };
    return btn;
}

function renderCalendar(confirmed) {
    const cal = document.getElementById('commitCalendar');
    cal.innerHTML = ""; // Reset
    
    // Get unique dates
    const busyDates = [...new Set(confirmed.map(b => b.booking_date.split('-')[2]))];
    
    // Create a 7-day small view starting today
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dayNum = String(d.getDate());
        
        const dayEl = document.createElement('div');
        dayEl.className = `cal-day ${busyDates.includes(dayNum.padStart(2, '0')) ? 'busy' : ''}`;
        dayEl.innerHTML = `<span>${dayNum}</span>`;
        cal.appendChild(dayEl);
    }
}

async function updateStatus(id, status) {
    const { error } = await _supabase.from('bookings').update({ status }).eq('id', id);
    if (!error) fetchBookings();
}

async function deleteEntry(id) {
    if (confirm("Purge forever?")) {
        await _supabase.from('bookings').delete().eq('id', id);
        fetchBookings();
    }
}

function openWA(b) {
    const msg = b.status === 'confirmed' 
        ? `Yo ${b.client_name}, Phestone here. Session for ${b.booking_date} @ ${b.booking_time} is LOCKED IN!` 
        : `Hey ${b.client_name}, unfortunately I can't make that slot. My apologies!`;
    const phone = b.client_phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}