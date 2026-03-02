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
    // Fetch bookings and join with reviews
    const { data, error } = await _supabase
        .from('bookings')
        .select('*, reviews(*)').order('created_at', { ascending: false });
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
    const lists = ['pendingList', 'approvedList', 'declinedList', 'completedList', 'archiveList', 'reviewWall'];
    lists.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = ""; });
    
   // Build UI
    data.forEach(booking => {
        // 1. Process Reviews for the Wall
        if (booking.reviews && booking.reviews.length > 0) {
            booking.reviews.forEach(rev => renderReviewOnWall(rev, booking));
        }

        // 2. Process Bookings
        if (booking.status === 'completed') {
            renderCompletedRow(booking);
        } else {
            const card = createCard(booking); // This uses your template logic
            
            let containerId = '';
            if (booking.status === 'pending') containerId = 'pendingList';
            else if (booking.status === 'confirmed') containerId = 'approvedList';
            else if (booking.status === 'declined') containerId = 'declinedList';
            else if (booking.status === 'archived') containerId = 'archiveList';

            if (containerId) {
                const container = document.getElementById(containerId);
                if (container) {
                    container.appendChild(card);
                } else {
                    console.error(`Target container #${containerId} not found in HTML!`);
                }
            }
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

    // --- NEW: Inject Review Info if it exists (For Archive/Completed) ---
    if (b.reviews && b.reviews.length > 0) {
        const rev = b.reviews[0];
        const starColor = rev.rating <= 2 ? "#ff4d4d" : rev.rating === 3 ? "#ffeb3b" : "#98fa9a";
        const revHTML = `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1);">
                <p style="color: ${starColor}; font-size: 11px; margin-bottom: 4px;">Rating: ${"★".repeat(rev.rating)}</p>
                <p style="color: #bbb; font-size: 11px; font-style: italic;">"${rev.comment}"</p>
            </div>
        `;
        cardDiv.querySelector('.deep-details').insertAdjacentHTML('beforeend', revHTML);
    }

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
        // Boosted button visibility for the archive section
        actions.innerHTML = `<button class="btn-purge" style="background: #ff4d4d; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">DELETE PERMANENTLY</button>`;
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
        <td>
            <button class="arch-btn" onclick="updateStatus('${b.id}', 'archived')" style="background: #333; color: #ff4d4d; border: 1px solid #ff4d4d44; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">ARCHIVE</button>
        </td>
    `;
    tbody.appendChild(row);
}

function renderReviewOnWall(review, booking) {
    const wall = document.getElementById('reviewWall');
    if (!wall) return;

    // Fix: Prioritize name from booking object if review.client_name is missing
    const displayName = booking.client_name || review.client_name || "Guest";
    const revCard = document.createElement('div');
    
    // Applying the soft layer style directly to ensure it works
    revCard.className = "review-admin-card glass-vibe"; 
    revCard.style.cssText = "background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 12px; margin-bottom: 10px; backdrop-filter: blur(10px);";

    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
    const starColor = review.rating <= 2 ? "#ff4d4d" : review.rating === 3 ? "#ffeb3b" : "#98fa9a";

    revCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:#98fa9a; font-size: 14px; text-transform: uppercase;">${displayName}</strong>
            <span style="color:${starColor}; font-size:14px;">${stars}</span>
        </div>
        <p style="color:#ffffff; font-size:13px; font-weight: 500; margin:5px 0; line-height:1.4;">${review.comment}</p>
        <div style="display:flex; gap:12px; margin-top:12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:10px;">
            <button onclick="toggleLike('${review.id}', ${!review.is_liked})" 
                style="background:${review.is_liked ? '#98fa9a' : '#333'}; 
                       color:${review.is_liked ? '#000' : '#fff'}; 
                       border:none; cursor:pointer; font-size:11px; padding:6px 12px; border-radius:4px; font-weight:800; transition: 0.3s;">
                ${review.is_liked ? '❤️ LIKED' : '♡ LIKE'}
            </button>
            <button onclick="deleteReview('${review.id}')" 
                style="background:transparent; border:1px solid #ff4d4d; color:#ff4d4d; cursor:pointer; font-size:11px; padding:5px 10px; border-radius:4px;">
                DELETE
            </button>
        </div>
    `;
    wall.appendChild(revCard);
}

// Add these new helper functions at the bottom of admin-bkng.js
async function toggleLike(reviewId, status) {
    const { error } = await _supabase.from('reviews').update({ is_liked: status }).eq('id', reviewId);
    if (!error) fetchBookings();
}

async function deleteReview(reviewId) {
    if(!confirm("Remove this review from your wall?")) return;
    await _supabase.from('reviews').delete().eq('id', reviewId);
    fetchBookings();
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