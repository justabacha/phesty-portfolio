// notifications.js - Root Directory

// 1. Initialize Realtime Subscriptions
const setupRealtimeNotifications = () => {
    console.log("Ghost Layer: Notification System Active...");

    // Listen for EVERYTHING in the reviews table
    _supabase
        .channel('schema-db-changes')
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'reviews' }, 
            (payload) => {
                const data = payload.new;
                // Only notify if Phestone liked it
                if (data.is_liked) {
                    showToast("❤️ Phestone loved your review!", "booking.html");
                }
            }
        )
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'bookings' }, 
            (payload) => {
                // This is for YOU when you are on the admin side
                showToast("🔥 New Session Request Received!", "admin-ledger.html");
            }
        )
        .subscribe();
};

// 2. The Glassmorphism Toast Creator
function showToast(message, linkUrl) {
    const toast = document.createElement('div');
    toast.className = 'glass-toast';
    
    // Adding the Quick Action Button inside the toast
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
            <span class="pulse-icon"></span>
            <div style="flex:1;">
                <p style="margin:0; font-size:12px; font-weight:700;">${message}</p>
            </div>
            <a href="${linkUrl}" style="background:#98fa9a; color:#000; padding:5px 10px; border-radius:4px; font-size:10px; font-weight:900; text-decoration:none;">VIEW</a>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; opacity:0.5; font-size:14px;">×</span>
        </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 8 seconds
    setTimeout(() => { if(toast) toast.remove(); }, 8000);
}

// Initialize when the script loads
setupRealtimeNotifications();