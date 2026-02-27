const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

document.addEventListener('DOMContentLoaded', () => {
    renderCalendar(currentMonth, currentYear);
    setupEventListeners();
    checkExistingBooking(); // This will now work!
});

// --- CALENDAR RENDER ---
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

// --- GLOBAL WITHDRAW FUNCTION ---
window.withdrawBooking = async function(id) {
    if (!confirm("Withdraw this request?")) return;
    const { error } = await _supabase.from('bookings').delete().eq('id', id);
    if (!error) {
        let myBookings = JSON.parse(localStorage.getItem('phesty_bookings') || "[]");
        myBookings = myBookings.filter(b => b.id !== id);
        localStorage.setItem('phesty_bookings', JSON.stringify(myBookings));
        location.reload();
    } else {
        alert("Withdrawal failed. Check connection.");
    }
};

// --- TRACKER DISPLAY ---
function checkExistingBooking() {
    const myBookings = JSON.parse(localStorage.getItem('phesty_bookings') || "[]");
    const tracker = document.getElementById('trackerMessage');
    
    if (tracker && myBookings.length > 0) {
        tracker.style.textAlign = "left"; 
        tracker.innerHTML = ""; 

        myBookings.forEach(b => {
            const dateObj = new Date(b.date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
            const dayNum = dateObj.getDate();
            const suffix = (dayNum === 1 || dayNum === 21 || dayNum === 31) ? "st" : 
                           (dayNum === 2 || dayNum === 22) ? "nd" : 
                           (dayNum === 3 || dayNum === 23) ? "rd" : "th";

            tracker.innerHTML += `
                <div style="margin-bottom: 25px; border-left: 2px solid #98fa9a; padding-left: 15px; position: relative; background: #080808; padding: 15px; border-radius: 12px;">
                    <span onclick="window.withdrawBooking('${b.id}')" style="position: absolute; top: 10px; right: 10px; color: #ff4d4d; font-size: 10px; cursor: pointer; font-weight: 900; border: 1px solid #ff4d4d33; padding: 4px 8px; border-radius: 4px;">WITHDRAW</span>
                    <p style="color: #444; font-size: 11px; font-weight: 800; margin-bottom: 8px;">
                        ${b.log} <span style="margin-left:10px; color:#222;">>></span> <span style="color:#98fa9a; margin-left:10px;">REQUEST LOGGED</span>
                    </p>
                    <p style="color: #fff; margin: 0; font-size: 13px; opacity: 0.7;">Session requested for:</p>
                    <p style="color: #fff; margin: 5px 0 0; font-size: 16px; font-weight: 800;">
                        ${dayName}, <span style="color:#98fa9a;">${monthName} ${dayNum}<sup>${suffix}</sup></span>
                    </p>
                    <p style="color: #98fa9a; margin: 2px 0 0; font-size: 18px; font-weight: 900;">@ ${b.time}</p>
                    <p style="color: #555; font-size: 10px; margin-top: 10px; text-transform: uppercase;">Status: <span style="color: #07d2fa;">Awaiting Review</span></p>
                </div>
            `;
        });
        tracker.innerHTML += `<p style="margin-top: 10px; color: #333; font-size: 11px; text-align: center; font-style: italic;">"Your creative window is being prioritized. Stay tuned."</p>`;
    }
}

function setupEventListeners() {
    const confirmBtn = document.getElementById('confirmBookingBtn');
    const modal = document.getElementById('bookingModal');

    document.getElementById('prevMonth').onclick = () => { currentMonth--; if(currentMonth < 0){ currentMonth = 11; currentYear--; } renderCalendar(currentMonth, currentYear); };
    document.getElementById('nextMonth').onclick = () => { currentMonth++; if(currentMonth > 11){ currentMonth = 0; currentYear++; } renderCalendar(currentMonth, currentYear); };
    document.querySelector('.close-modal').onclick = () => modal.classList.remove('active');

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const name = document.getElementById('clientName').value.trim();
            const phone = document.getElementById('clientPhone').value.trim();
            const rawTime = document.getElementById('bookingTime').value;
            const purpose = document.getElementById('bookingPurpose').value.trim();

            const phoneRegex = /^\+254\d{9}$/; 
            if (!name || !phoneRegex.test(phone) || !rawTime || !purpose) {
                alert("Fill everything! +254 number must be 12 digits total.");
                return;
            }

            let [h, m] = rawTime.split(':');
            const ampm = h >= 12 ? 'PM' : 'AM';
            const formattedTime = `${h % 12 || 12}:${m} ${ampm}`;
            const logStamp = new Date().getHours().toString().padStart(2, '0') + ":" + new Date().getMinutes().toString().padStart(2, '0');

            confirmBtn.innerText = "Locking Ledger...";
            confirmBtn.disabled = true;
            
            const { data, error } = await _supabase.from('bookings').insert([{ 
                client_name: name, client_phone: phone, booking_time: formattedTime, 
                purpose: purpose, booking_date: selectedDate, status: 'pending' 
            }]).select();

            if (!error) {
                let myBookings = JSON.parse(localStorage.getItem('phesty_bookings') || "[]");
                myBookings.unshift({ id: data[0].id, date: selectedDate, time: formattedTime, log: logStamp });
                localStorage.setItem('phesty_bookings', JSON.stringify(myBookings));

                alert("Request Logged!");
                location.reload(); 
            } else {
                alert("Error saving.");
                confirmBtn.disabled = false;
            }
        };
    }
}