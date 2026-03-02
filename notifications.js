// notifications.js - Root Directory

const setupRealtimeNotifications = () => {
    console.log("Ghost Layer: Smart Notification System Active...");

    // 1. Identify if this is Phestone (Admin) or a Client
    const isAdmin = window.location.pathname.includes('admin'); 
    // Get the current client's booking ID from storage to target them specifically
    const myBookingId = localStorage.getItem('current_booking_id'); 

    _supabase
        .channel('phesty-studio-core')
        
        // --- ADMIN ONLY: New Bookings, Reviews, Followers, and Photo Likes ---
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
            if (isAdmin) showToast(`🔥 New Request: ${payload.new.client_name}`, "admin-ledger.html");
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
            if (isAdmin) showToast(`💬 New Review from ${payload.new.client_name}`, "admin-ledger.html");
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'followers' }, (payload) => {
            if (isAdmin) showToast("👤 You got a new follower!", "index.html");
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'photos' }, (payload) => {
            // Logic for Photo Likes (Admin Only)
            if (isAdmin && payload.new.likes > payload.old.likes) {
                showToast(`💖 Someone liked a ${payload.new.category} photo!`, "gallery.html");
            }
        })

        // --- CLIENT ONLY: Targeted updates for the specific person ---
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
            if (myBookingId && payload.new.id.toString() === myBookingId) {
                if (payload.new.status === 'confirmed') {
                    showToast("✅ Phestone confirmed your session!", "booking.html");
                } else if (payload.new.status === 'completed') {
                    showToast("📸 Mission Complete! Leave a review.", "booking.html");
                }
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reviews' }, (payload) => {
            if (payload.new.is_liked && myBookingId && payload.new.booking_id.toString() === myBookingId) {
                showToast("❤️ Phestone loved your comment!", "booking.html");
            }
        })

        // --- GLOBAL: New Photo Uploads (Everyone sees this) ---
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
            <div style="flex:1;">
                <p style="margin:0; font-size:12px; font-weight:800; letter-spacing:0.5px;">${message}</p>
            </div>
            <a href="${linkUrl}" style="background:#98fa9a; color:#000; padding:6px 12px; border-radius:4px; font-size:10px; font-weight:900; text-decoration:none; text-transform:uppercase;">VIEW</a>
            <span onclick="this.closest('.glass-toast').remove()" style="cursor:pointer; opacity:0.5; font-size:18px; padding-left:5px;">&times;</span>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if(toast) toast.remove(); }, 10000);
}

document.addEventListener('DOMContentLoaded', setupRealtimeNotifications);