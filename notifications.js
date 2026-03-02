// notifications.js - Root Directory

const setupRealtimeNotifications = () => {
    console.log("Ghost Layer: Universal Notification System Active...");

    _supabase
        .channel('phesty-studio-core')
        // 1. Listen for Booking Status & Likes (Client Side)
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'bookings' }, 
            (payload) => {
                const data = payload.new;
                if (data.status === 'confirmed') {
                    showToast("✅ Phestone just confirmed your session!", "booking.html");
                } else if (data.status === 'completed') {
                    showToast("📸 Mission Complete! Leave a review.", "booking.html");
                }
            }
        )
        // 2. Listen for Review Likes (Client Side)
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'reviews' }, 
            (payload) => {
                if (payload.new.is_liked) {
                    showToast("❤️ Phestone loved your comment!", "booking.html");
                }
            }
        )
        // 3. Listen for New Bookings & Reviews (Admin Side - Phestone)
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'bookings' }, 
            (payload) => {
                showToast(`🔥 New Request: ${payload.new.client_name}`, "admin-ledger.html");
            }
        )
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'reviews' }, 
            (payload) => {
                showToast(`💬 New Review from ${payload.new.client_name}`, "admin-ledger.html");
            }
        )
        // 4. Listen for Social Hits (Followers & Photo Likes)
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'followers' }, 
            (payload) => {
                showToast("👤 You got a new follower!", "index.html");
            }
        )
        .subscribe();
};

function showToast(message, linkUrl) {
    // Check if a toast already exists to prevent stacking clutter
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

// Start Listening
document.addEventListener('DOMContentLoaded', setupRealtimeNotifications);