// notifications.js - Root Directory

const setupRealtimeNotifications = () => {
    console.log("Ghost Layer: System Active...");

    // 1. Identify User Role
    // If your admin URL is like phesty.com/admin-bkng.html, this detects you
    const isAdmin = window.location.pathname.includes('admin'); 
    const myBookingId = localStorage.getItem('phesty_booking_id'); 

    _supabase
        .channel('phesty-core-v2')
        
        // --- ADMIN ALERTS (You see these on any page) ---
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
            if (isAdmin) showToast(`🔥 New Request: ${payload.new.client_name}`, "admin-bkng.html");
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
            if (isAdmin) showToast(`💬 New Review: ${payload.new.client_name}`, "admin-bkng.html");
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'followers' }, (payload) => {
            if (isAdmin) showToast("👤 New Follower gained!", "index.html");
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'photos' }, (payload) => {
            // Check if likes increased
            if (isAdmin && (payload.new.likes > (payload.old.likes || 0))) {
                showToast(`💖 Someone liked a ${payload.new.category} photo!`, "gallery.html");
            }
        })

        // --- CLIENT ALERTS (Targeted) ---
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
            const data = payload.new;
            // Target the specific client by ID
            if (myBookingId && data.id.toString() === myBookingId) {
                if (data.status === 'confirmed') showToast("✅ Phestone confirmed your session!", "booking.html");
                if (data.status === 'completed') showToast("📸 Session Complete! Leave a review.", "booking.html");
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reviews' }, (payload) => {
            // If Phestone likes a review, notify that client
            if (payload.new.is_liked) {
                showToast("❤️ Phestone loved your review!", "booking.html");
            }
        })

        // --- GLOBAL ALERTS (Everyone) ---
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos' }, (payload) => {
            showToast(`📸 NEW HEAT: New ${payload.new.category} photo dropped!`, "gallery.html");
        })

        .subscribe();
};

function showToast(message, linkUrl) {
    const existing = document.querySelector('.glass-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'glass-toast';
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
            <span class="pulse-icon"></span>
            <div style="flex:1;"><p style="margin:0; font-size:12px; font-weight:800;">${message}</p></div>
            <a href="${linkUrl}" style="background:#98fa9a; color:#000; padding:6px 12px; border-radius:4px; font-size:10px; font-weight:900; text-decoration:none;">VIEW</a>
            <span onclick="this.closest('.glass-toast').remove()" style="cursor:pointer; opacity:0.7; font-size:16px;">&times;</span>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if(toast) toast.remove(); }, 10000);
}

document.addEventListener('DOMContentLoaded', setupRealtimeNotifications);