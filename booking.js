const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

document.addEventListener('DOMContentLoaded', () => {
    renderCalendar(currentMonth, currentYear);
    setupEventListeners();
    checkExistingBooking();
});

async function renderCalendar(month, year) {
    const grid = document.getElementById('calendarGrid');
    const monthDisplay = document.getElementById('monthDisplay');
    if (!grid) return;

    grid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    monthDisplay.innerText = `${monthNames[month]} ${year}`;

    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div')).classList.add('day-empty');
    }

    const { data: bookings } = await _supabase.from('bookings').select('booking_date');

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = i;

        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isPast = new Date(year, month, i) < new Date().setHours(0,0,0,0);
        const isBooked = bookings?.some(b => b.booking_date === dateString);

        if (isPast) {
            dayDiv.classList.add('past'); 
        } else if (isBooked) {
            dayDiv.classList.add('booked'); 
        } else {
            dayDiv.onclick = () => openBookingModal(dateString, dayDiv);
        }
        grid.appendChild(dayDiv);
    }
}

function openBookingModal(date, element) {
    selectedDate = date;
    document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('bookingModal').classList.add('active');
    document.getElementById('targetDateDisplay').innerText = `Booking for: ${date}`;
}

window.withdrawBooking = async function(id) {
    if (!confirm("Withdraw this request?")) return;
    const { error } = await _supabase.from('bookings').delete().eq('id', id);
    if (!error) {
        let myBookings = JSON.parse(localStorage.getItem('phesty_bookings') || "[]");
        myBookings = myBookings.filter(b => b.id !== id);
        localStorage.setItem('phesty_bookings', JSON.stringify(myBookings));
        location.reload();
    }
};

async function checkExistingBooking() {
    let myBookings = JSON.parse(localStorage.getItem('phesty_bookings') || "[]");
    const tracker = document.getElementById('trackerMessage');
    if (!tracker) return;

    // SYNC WITH SUPABASE (Fetch ID and Status)
    try {
        const { data: remoteBookings } = await _supabase
            .from('bookings')
            .select('id, status');

        if (remoteBookings) {
            const remoteIds = remoteBookings.map(b => b.id.toString());
            
            // Filter out deleted bookings and update status for remaining ones
            myBookings = myBookings
                .filter(local => remoteIds.includes(local.id.toString()))
                .map(local => {
                    const remoteMatch = remoteBookings.find(r => r.id.toString() === local.id.toString());
                    return { ...local, status: remoteMatch ? remoteMatch.status : 'pending' };
                });

            localStorage.setItem('phesty_bookings', JSON.stringify(myBookings));
        }
    } catch (e) {
        console.error("Sync error:", e);
    }

    // 1. EMPTY STATE
    if (myBookings.length === 0) {
        tracker.style.textAlign = "center";
        tracker.innerHTML = `<p style="color: #444; font-size: 14px; margin-top: 20px;">Choose a date on the calendar to check availability.</p>`;
        return;
    }

    // 2. RECEIPT STATE
    tracker.style.textAlign = "left"; 
    tracker.innerHTML = ""; 

    myBookings.forEach(b => {
        const d = new Date(b.date);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = d.toLocaleDateString('en-US', { month: 'long' });
        const dayNum = d.getDate();
        const suffix = (dayNum % 10 === 1 && dayNum !== 11) ? "st" : (dayNum % 10 === 2 && dayNum !== 12) ? "nd" : (dayNum % 10 === 3 && dayNum !== 13) ? "rd" : "th";

        // Dynamic Status Logic
        let statusText = "Awaiting Review, Phestone will get back to you soon.";
        let statusColor = "#07d2fa"; // Neon Blue

        if (b.status === 'confirmed') {
            statusText = "Phestone just Confirmed the Session";
            statusColor = "#f7fbf7"; // Neon Green
        } else if (b.status === 'declined') {
            statusText = "Request Declined";
            statusColor = "#ff4d4d"; // Red
        }

        tracker.innerHTML += `
            <div class="receipt-card">
                <span onclick="window.withdrawBooking('${b.id}')" style="position: absolute; top: 15px; right: 15px; color: #ff4d4d; font-size: 10px; cursor: pointer; font-weight: 900; border: 1px solid #ff4d4d44; padding: 4px 8px; border-radius: 4px; background: #000;">WITHDRAW</span>
                
                <p style="color: #fdf3f3; font-size: 11px; font-weight: 800; margin-bottom: 10px;">
                    ${b.log} <span style="margin-left:10px; color:#fdf3f3;">>></span> <span style="color:#98fa9a; margin-left:10px;">REQUEST LOGGED</span>
                </p>
                
                <p style="color: #fff; margin: 0; font-size: 13px; opacity: 0.7;">Session requested for:</p>
                <p style="color: #fff; margin: 5px 0 0; font-size: 18px; font-weight: 800;">
                    ${dayName}, <span style="color:#98fa9a;">${monthName} ${dayNum}<sup>${suffix}</sup></span>
                </p>
                <p style="color: #74f974; margin: 2px 0 0; font-size: 22px; font-weight: 900;">@ ${b.time}</p>
                
                <p style="color: #92dafc; font-size: 10px; margin-top: 15px; text-transform: uppercase;">Status: <span style="color: ${statusColor}; font-weight: 800;">${statusText}</span></p>
            </div>
        `;
    });

    tracker.innerHTML += `<p style="margin-top: 20px; color: #333; font-size: 11px; text-align: center; font-style: italic; opacity: 0.6;">"Your creative window is being prioritized. Stay tuned."</p>`;
}

function setupEventListeners() {
    const confirmBtn = document.getElementById('confirmBookingBtn');
    const modal = document.getElementById('bookingModal');

    document.getElementById('prevMonth').onclick = () => { currentMonth--; if(currentMonth < 0){ currentMonth = 11; currentYear--; } renderCalendar(currentMonth, currentYear); };
    document.getElementById('nextMonth').onclick = () => { currentMonth++; if(currentMonth > 11){ currentMonth = 0; currentYear++; } renderCalendar(currentMonth, currentYear); };
    document.querySelector('.close-modal').onclick = () => modal.classList.remove('active');

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const inputs = [
                { id: 'clientName', val: document.getElementById('clientName').value.trim() },
                { id: 'clientPhone', val: document.getElementById('clientPhone').value.trim() },
                { id: 'bookingTime', val: document.getElementById('bookingTime').value },
                { id: 'bookingPurpose', val: document.getElementById('bookingPurpose').value.trim() }
            ];

            let hasError = false;
            const phoneRegex = /^\+254\d{9}$/;

            // VALIDATION LOOP
            inputs.forEach(input => {
                const el = document.getElementById(input.id);
                el.classList.remove('input-error');

                if (!input.val || (input.id === 'clientPhone' && !phoneRegex.test(input.val))) {
                    el.classList.add('input-error');
                    hasError = true;
                }
            });

            if (hasError) {
                setTimeout(() => inputs.forEach(i => document.getElementById(i.id).classList.remove('input-error')), 3000);
                return;
            }

            let [h, m] = inputs[2].val.split(':');
            const formattedTime = `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
            const logStamp = new Date().getHours().toString().padStart(2, '0') + ":" + new Date().getMinutes().toString().padStart(2, '0');

            confirmBtn.innerText = "Locking...";
            confirmBtn.disabled = true;
            
            const { data, error } = await _supabase.from('bookings').insert([{ 
                client_name: inputs[0].val, client_phone: inputs[1].val, 
                booking_time: formattedTime, purpose: inputs[3].val, 
                booking_date: selectedDate, status: 'pending' 
            }]).select();

            if (!error) {
                let myBookings = JSON.parse(localStorage.getItem('phesty_bookings') || "[]");
                myBookings.unshift({ id: data[0].id, date: selectedDate, time: formattedTime, log: logStamp });
                localStorage.setItem('phesty_bookings', JSON.stringify(myBookings));
                location.reload(); 
            } else {
                confirmBtn.disabled = false;
            }
        };
    }
}