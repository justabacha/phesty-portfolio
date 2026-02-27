const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

document.addEventListener('DOMContentLoaded', () => {
    renderCalendar(currentMonth, currentYear);
    setupEventListeners();
    checkExistingBooking(); // Restored this
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
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('day-empty');
        grid.appendChild(emptyDiv);
    }

    const { data: bookings } = await _supabase.from('bookings').select('booking_date');

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = i;
        dayDiv.style.cursor = "pointer"; // Explicitly set hand pointer

        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isPast = new Date(year, month, i) < new Date().setHours(0,0,0,0);
        const isBooked = bookings?.some(b => b.booking_date === dateString);

        if (isPast || isBooked) {
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

    const modal = document.getElementById('bookingModal');
    document.getElementById('targetDateDisplay').innerText = `Booking for: ${date}`;
    modal.classList.add('active');
}

function setupEventListeners() {
    const modal = document.getElementById('bookingModal');
    const closeBtn = document.querySelector('.close-modal');
    const confirmBtn = document.getElementById('confirmBookingBtn');
    
    // Month Switching Logic
    document.getElementById('prevMonth').onclick = () => {
        currentMonth--;
        if(currentMonth < 0){ currentMonth = 11; currentYear--; }
        renderCalendar(currentMonth, currentYear);
    };

    document.getElementById('nextMonth').onclick = () => {
        currentMonth++;
        if(currentMonth > 11){ currentMonth = 0; currentYear++; }
        renderCalendar(currentMonth, currentYear);
    };

    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');

    if (confirmBtn) {
    confirmBtn.onclick = async () => {
        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        const rawTime = document.getElementById('bookingTime').value; 
        const purpose = document.getElementById('bookingPurpose').value.trim();

        if (!name || phone.length < 10 || !rawTime || !selectedDate) {
            alert("Phestone needs your name, number, and time!");
            return;
        }

        // Format the Appointment Time (e.g., 2:30 PM)
        let [hours, minutes] = rawTime.split(':');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const formattedApptTime = `${hours}:${minutes} ${ampm}`;

        // CAPTURE REAL-TIME STAMP (e.g., 14:08)
        const now = new Date();
        const logTime = now.getHours().toString().padStart(2, '0') + ":" + 
                        now.getMinutes().toString().padStart(2, '0');

        confirmBtn.innerText = "Locking Ledger...";
        confirmBtn.disabled = true;
        
        const { error } = await _supabase.from('bookings').insert([
            { 
                client_name: name, 
                client_phone: phone, 
                booking_time: formattedApptTime, 
                purpose: purpose, 
                booking_date: selectedDate,
                status: 'pending' 
            }
        ]);

        if (!error) {
            // SAVE EVERYTHING LOCALLY
            localStorage.setItem('phesty_pending_date', selectedDate);
            localStorage.setItem('phesty_pending_time', formattedApptTime);
            localStorage.setItem('phesty_log_time', logTime); // The 14:08 stamp

            alert(`Locked in!`);
            modal.classList.remove('active');
            renderCalendar(currentMonth, currentYear);
            checkExistingBooking(); // Refresh the UI
        } else {
            console.error(error);
            alert("Error saving to ledger.");
        }
        confirmBtn.innerText = "Request Booking";
        confirmBtn.disabled = false;
    };
}
}  

function checkExistingBooking() {
    const pendingDate = localStorage.getItem('phesty_pending_date');
    const pendingTime = localStorage.getItem('phesty_pending_time');
    const logTime = localStorage.getItem('phesty_log_time'); // The 14:08
    const tracker = document.getElementById('trackerMessage');
    
    if (pendingDate && tracker) {
        const dateObj = new Date(pendingDate);
        const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const dayNum = dateObj.getDate();

        const suffix = (dayNum === 1 || dayNum === 21 || dayNum === 31) ? "st" : 
                       (dayNum === 2 || dayNum === 22) ? "nd" : 
                       (dayNum === 3 || dayNum === 23) ? "rd" : "th";

        tracker.style.textAlign = "left"; 
        tracker.innerHTML = `
            <div style="margin-bottom: 20px; border-left: 2px solid #98fa9a; padding-left: 15px; position: relative;">
                <p style="color: #666; font-size: 11px; font-weight: 800; margin-bottom: 8px;">
                    ${logTime || '--:--'} <span style="margin-left:10px; color:#444;">&gt;&gt;</span> <span style="color:#98fa9a; margin-left:10px;">REQUEST LOGGED</span>
                </p>
                
                <p style="color: #fff; margin: 0; font-size: 14px; opacity: 0.8;">Session requested for:</p>
                <p style="color: #fff; margin: 5px 0 0; font-size: 18px; font-weight: 800;">
                    ${dayName}, ${monthName} ${dayNum}<sup>${suffix}</sup>
                </p>
                <p style="color: #98fa9a; margin: 2px 0 0; font-size: 20px; font-weight: 900;">
                    @ ${pendingTime}
                </p>
                
                <p style="color: #555; font-size: 11px; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px;">
                    Status: <span style="color: #07d2fa;">Awaiting Review</span>
                </p>
            </div>
            
            <div style="border-left: 2px solid #1a1a1a; padding-left: 15px; opacity: 0.3;">
                <p style="color: #444; font-size: 11px; font-weight: 800;">--:-- <span style="margin-left:10px;">&gt;&gt;</span> STUDIO CONFIRMATION</p>
                <p style="color: #333; margin: 0; font-size: 14px;">Awaiting verification...</p>
            </div>
            
            <p style="margin-top: 30px; color: #444; font-size: 12px; text-align: center; font-style: italic; border-top: 1px solid #111; padding-top: 15px;">
                "Your creative window is being prioritized. Stay tuned."
            </p>
        `;
    }
}