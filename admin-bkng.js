const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', fetchBookings);

async function fetchBookings() {
    console.log("Fetching fresh data...");
    const { data, error } = await _supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error("DB Error:", error);

    // 1. Setup Calendar
    renderCalendar(data.filter(b => b.status === 'confirmed'));

    // 2. Clear current lists
    const pendingDiv = document.getElementById('pendingList');
    const approvedDiv = document.getElementById('approvedList');
    const declinedDiv = document.getElementById('declinedList');
    
    pendingDiv.innerHTML = "";
    approvedDiv.innerHTML = "";
    declinedDiv.innerHTML = "";

    // 3. Build and Place Cards
    data.forEach(booking => {
        const card = createCard(booking);
        
        if (booking.status === 'pending') pendingDiv.appendChild(card);
        else if (booking.status === 'confirmed') approvedDiv.appendChild(card);
        else if (booking.status === 'declined') declinedDiv.appendChild(card);
    });
}

function createCard(b) {
    const template = document.getElementById('cardTemplate');
    const clone = template.content.cloneNode(true);
    const cardDiv = clone.querySelector('.booking-card');

    // Fill Data
    cardDiv.classList.add(b.status);
    cardDiv.querySelector('.client-name').textContent = b.client_name;
    cardDiv.querySelector('.request-date').textContent = `${b.booking_date} @ ${b.booking_time}`;
    cardDiv.querySelector('.purpose-text').textContent = b.purpose || "No message provided.";

    // Toggle Expansion
    cardDiv.querySelector('.card-main').onclick = () => cardDiv.classList.toggle('active');

    // Build Buttons
    const actionArea = cardDiv.querySelector('.ledger-actions');
    
    if (b.status === 'pending') {
        actionArea.innerHTML = `
            <button class="btn-confirm">APPROVE</button>
            <button class="btn-delete">DECLINE</button>
        `;
        actionArea.querySelector('.btn-confirm').onclick = () => updateStatus(b.id, 'confirmed');
        actionArea.querySelector('.btn-delete').onclick = () => updateStatus(b.id, 'declined');
    } else {
        actionArea.innerHTML = `
            <button class="btn-wa">WHATSAPP</button>
            <button class="btn-purge">PURGE</button>
        `;
        actionArea.querySelector('.btn-wa').onclick = () => openWA(b);
        actionArea.querySelector('.btn-purge').onclick = () => deleteEntry(b.id);
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
    
    // Shift for Monday start (JS 0 is Sunday)
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));
    
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = `cal-cell ${busyDays.includes(d) ? 'busy' : ''}`;
        cell.textContent = d;
        grid.appendChild(cell);
    }
}

// Add this at the very top of admin-bkng.js to clear any cache issues
console.log("🚀 PHESTONE ADMIN SYSTEM INITIALIZED");

async function updateStatus(id, newStatus) {
    // Force ID to string and trim any hidden spaces
    const cleanId = String(id).trim();
    console.log(`📡 Sending Update: ID [${cleanId}] to [${newStatus}]`);
    
    const { data, error } = await _supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', cleanId)
        .select(); 

    if (error) {
        console.error("❌ SUPABASE ERROR:", error.message);
        alert("Database Error: " + error.message);
    } else if (data && data.length > 0) {
        console.log("✅ SUCCESS:", data[0]);
        // Remove the alert once you see it working to keep it smooth
        fetchBookings(); 
    } else {
        console.warn("⚠️ No rows changed. This is usually an RLS Policy issue.");
        alert("System connected, but Supabase RLS is blocking the update. Check your Policies!");
    }
}

async function deleteEntry(id) {
    if (!confirm("Purge this record?")) return;
    const { error } = await _supabase.from('bookings').delete().eq('id', id);
    if (!error) fetchBookings();
}

function openWA(b) {
    const msg = b.status === 'confirmed' 
        ? `Yo ${b.client_name}, Phestone here. Your session for ${b.booking_date} is LOCKED IN!` 
        : `Hey ${b.client_name}, Phestone here. I'm fully booked for that slot, sorry!`;
    const phone = b.client_phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}