// notifications.js - Root Directory

const setupRealtimeNotifications = () => {
    // 1. Better Admin Detection
    const isAdmin = window.location.pathname.includes('admin') || localStorage.getItem('phesty_admin_mode') === 'true'; 
    const myBookingId = localStorage.getItem('phesty_booking_id'); 

    _supabase
        .channel('phesty-studio-final-v3')
        
        // --- ADMIN SIDE: Only you see these ---
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
            // Check if the 'likes' column actually increased
            if (isAdmin && payload.new.likes > (payload.old.likes || 0)) {
                showToast(`💖 Someone liked a photo in ${payload.new.category}!`, "gallery.html");
            }
        })

        // --- CLIENT SIDE: Only the specific client sees these ---
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
            const data = payload.new;
            if (myBookingId && data.id.toString() === myBookingId) {
                if (data.status === 'confirmed') showToast("✅ Phestone confirmed your session!", "booking.html");
                if (data.status === 'completed') showToast("📸 Session Complete! Time for a review.", "booking.html");
                if (data.status === 'declined') showToast("❌ Request declined. Check your email.", "booking.html");
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reviews' }, (payload) => {
            // Targeted: Only the person who wrote the review sees Phestone's like
            if (payload.new.is_liked && myBookingId && payload.new.booking_id?.toString() === myBookingId) {
                showToast("❤️ Phestone loved your review!", "booking.html");
            }
        })

        // --- GLOBAL: Everyone sees new content uploads ---
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos' }, (payload) => {
            showToast(`📸 NEW HEAT: New ${payload.new.category} shot added!`, "gallery.html");
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
            <span onclick="this.closest('.glass-toast').remove()" style="cursor:pointer; opacity:0.8; font-size:18px;">&times;</span>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if(toast) toast.remove(); }, 10000);
}

document.addEventListener('DOMContentLoaded', setupRealtimeNotifications);