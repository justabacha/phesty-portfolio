// notifications.js - Root Directory

const setupRealtimeNotifications = () => {
    // 1. Identify User Role
    const isAdmin = window.location.pathname.includes('admin'); 
    
    // IMPORTANT: This must match what you save when a client books!
    const myBookingId = localStorage.getItem('phesty_booking_id'); 

    _supabase
        .channel('phesty-studio-final')
        
        // --- ADMIN ONLY ALERTS ---
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
            if (isAdmin) showToast(`🔥 New Request: ${payload.new.client_name}`, "admin-bkng.html");
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
            if (isAdmin) showToast(`💬 New Review: ${payload.new.client_name}`, "admin-bkng.html");
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'followers' }, (payload) => {
            if (isAdmin) showToast("👤 New Follower gained!", "index.html");
        })
        // FIX: Photo Like Notification (Admin Only)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'photos' }, (payload) => {
            if (isAdmin && payload.new.likes > (payload.old.likes || 0)) {
                showToast(`💖 Someone liked a ${payload.new.category} photo!`, "gallery.html");
            }
        })

        // --- TARGETED CLIENT ALERTS (No longer global) ---
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
            const data = payload.new;
            // Only show to the specific client who owns this booking ID
            if (myBookingId && data.id.toString() === myBookingId) {
                if (data.status === 'confirmed') showToast("✅ Phestone confirmed your session!", "booking.html");
                if (data.status === 'completed') showToast("📸 Session Complete! Leave a review.", "booking.html");
                if (data.status === 'declined') showToast("❌ Session Declined. Check your email.", "booking.html");
            }
        })
        // FIX: Targeted Review Like (Only for the reviewer)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reviews' }, (payload) => {
            if (payload.new.is_liked && myBookingId && payload.new.booking_id.toString() === myBookingId) {
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