// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. UNIFIED DOM CONTENT LOADED
document.addEventListener('DOMContentLoaded', () => {
    // --- Contact Modal Logic ---
    const modal = document.getElementById("contactModal");
    const contactBtn = document.getElementById("contactBtn");
    const closeBtn = document.querySelector(".close-btn");

    if (contactBtn) contactBtn.addEventListener("click", () => modal.style.display = "block");
    if (closeBtn) closeBtn.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    // --- FOLLOW SYSTEM LOGIC ---
    const followModal = document.getElementById('followModal');
    const openFollowBtn = document.getElementById('openFollowModal');
    const closeFollowBtn = document.querySelector('.close-follow');
    const confirmFollowBtn = document.getElementById('confirmFollowBtn');

    if (localStorage.getItem('phestyFollowed') === 'true') {
        if (openFollowBtn) openFollowBtn.style.display = 'none';
    } else {
        setTimeout(() => {
            if (localStorage.getItem('phestyFollowed') !== 'true' && followModal) {
                followModal.style.display = 'flex';
            }
        }, 120000); // 2 minutes
    }

    if (openFollowBtn) openFollowBtn.onclick = (e) => { e.preventDefault(); followModal.style.display = 'flex'; };
    if (closeFollowBtn) closeFollowBtn.onclick = () => followModal.style.display = 'none';

    if (confirmFollowBtn) {
        confirmFollowBtn.onclick = async () => {
            const name = document.getElementById('fanName').value;
            if (!name) return alert("Please enter your name!");
            
            confirmFollowBtn.innerText = "Joining...";
            const token = 'token-' + Math.random().toString(36).substr(2, 9);
            const { error } = await _supabase.from('followers').insert([{ fan_name: name, notification_token: token }]);

            if (!error) {
                localStorage.setItem('phestyFollowed', 'true');
                alert(`Thanks for joining, ${name}!`);
                followModal.style.display = 'none';
                if (openFollowBtn) openFollowBtn.style.display = 'none';
            }
            confirmFollowBtn.innerText = "Stay Tuned";
        };
    }

    // --- Route Logic ---
    if (window.location.pathname.includes('portfolio.html')) {
        loadFullPortfolio();
    } else if (window.location.pathname.includes('gallery.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const cat = urlParams.get('type') || 'street'; 
        loadGallery(cat);
    } else {
        loadAllStacks();
    }
});

// 3. LOAD PORTFOLIO (EVERYTHING)
async function loadFullPortfolio() {
    const grid = document.getElementById('portfolioGrid');
    if (!grid) return;

    const { data, error } = await _supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error("Error:", error);

    grid.innerHTML = '';
    data.forEach(photo => {
        const isLiked = localStorage.getItem(`liked_${photo.id}`) === 'true';
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.style.position = 'relative';
        item.innerHTML = `
            <img src="${photo.image_url}" alt="${photo.category}" 
                onclick="handlePhotoClick(event, '${photo.image_url}', '${photo.id}')" style="cursor: zoom-in;">
            <div class="heart-btn ${isLiked ? 'active' : ''}" id="heart-${photo.id}" 
                onclick="event.stopPropagation(); triggerLike('${photo.id}', event)">❤</div>
        `;
        grid.appendChild(item);
    });
}

// 4. LOAD CATEGORY GALLERY
async function loadGallery(categoryFilter) {
    const container = document.getElementById('gallery-container');
    const title = document.getElementById('category-title');
    if (!container) return;

    if (title) title.innerText = categoryFilter.toUpperCase();

    const { data: photos, error } = await _supabase
        .from('photos')
        .select('*')
        .ilike('category', categoryFilter); 

    if (error) return console.error(error);

    container.innerHTML = ''; 
    
    if (photos.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; width:100%;">No photos in this category yet.</p>';
        return;
    }

    photos.forEach(photo => {
        const isLiked = localStorage.getItem(`liked_${photo.id}`) === 'true';
        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-item-wrapper';
        wrapper.style.position = 'relative';
        wrapper.innerHTML = `
            <img src="${photo.image_url}" class="gallery-item" 
                onclick="handlePhotoClick(event, '${photo.image_url}', '${photo.id}')" style="cursor: zoom-in; width:100%;">
            <div class="heart-btn ${isLiked ? 'active' : ''}" id="heart-${photo.id}" 
                onclick="event.stopPropagation(); triggerLike('${photo.id}', event)">❤</div>
        `;
        container.appendChild(wrapper);
    });
}

// 5. STACK LOGIC
async function loadStackPhotos(category, containerSelector) {
    try {
        const { data, error } = await _supabase
            .from('photos') 
            .select('image_url')
            .eq('category', category.toLowerCase());

        if (error || !data || data.length === 0) return;

        const shuffled = data.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        const images = document.querySelectorAll(`${containerSelector} img`);
        
        selected.forEach((photo, index) => {
            if(images[index]) {
                images[index].src = photo.image_url;
                images[index].style.opacity = "1";
            }
        });
    } catch (err) {
        console.log("Error loading stacks");
    }
}

function loadAllStacks() {
    loadStackPhotos('street', '.top-row .category-card:nth-child(1)');
    loadStackPhotos('nature', '.top-row .category-card:nth-child(2)');
    loadStackPhotos('portrait', '.portrait-center');
}

// 6. INTERACTION LOGIC (Double Tap & Heart Logic)
let lastClick = 0;
function handlePhotoClick(e, src, photoId) {
    const now = Date.now();
    if (now - lastClick < 300) {
        // DOUBLE TAP
        triggerLike(photoId, e);
    } else {
        // SINGLE TAP
        openLightbox(src);
    }
    lastClick = now;
}

async function triggerLike(photoId, event) {
   // Check if already liked to prevent double database calls, but we still allow the UI to "pop"
    const alreadyLiked = localStorage.getItem(`liked_${photoId}`) === 'true';
    // 1. Mark as liked locally
    localStorage.setItem(`liked_${photoId}`, 'true');
    
// 2. Change heart color to red IMMEDIATELY
    const heartEl = document.getElementById(`heart-${photoId}`);
    if (heartEl) {
        heartEl.classList.add('active');
        heartEl.style.color = '#ff4d4d'; // Instant red
        heartEl.style.transform = 'scale(1.4)'; // Instant pop
        setTimeout(() => heartEl.style.transform = 'scale(1)', 200);
    }

    // 3. Show the burst animation
    showHeartAnimation(event.pageX, event.pageY);

    // 4. Update Database only if they haven't liked it before
    if (!alreadyLiked) {
        localStorage.setItem(`liked_${photoId}`, 'true');
        await _supabase.rpc('increment_likes', { row_id: photoId });
    }
}
function showHeartAnimation(x, y) {
    // Create multiple hearts for a "burst" effect
    for (let i = 0; i < 6; i++) {
        const heart = document.createElement('div');
        heart.innerHTML = '❤️';
        const randomX = x + (Math.random() * 40 - 20);
        const randomY = y + (Math.random() * 40 - 20);
        heart.style.cssText = `
            position:absolute; left:${randomX}px; top:${randomY}px; 
            transform:translate(-50%,-50%); animation: fly 1s ease-out forwards; 
            pointer-events:none; z-index:10002; font-size:${1 + Math.random()}rem;
        `;
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1000);
    }
}

// 7. LIGHTBOX & DOWNLOAD
const lightbox = document.createElement('div');
lightbox.id = 'phestyLightbox';
lightbox.style.cssText = `display: none; position: fixed; z-index: 9999; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); justify-content: center; align-items: center; cursor: pointer;`;
lightbox.innerHTML = `<img id="lightboxImg" style="max-width: 90%; max-height: 85%; object-fit: contain; transition: 0.3s ease;"><button id="downloadBtn" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: #98fa9a; color: #000; padding: 12px 25px; border-radius: 50px; border: none; font-weight: bold; cursor: pointer; z-index: 10001;">Download Image</button>`;
document.body.appendChild(lightbox);

const lbImg = document.getElementById('lightboxImg');
const dlBtn = document.getElementById('downloadBtn');

async function forceDownload(url) {
    dlBtn.innerText = "Downloading...";
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `phesty-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        dlBtn.innerText = "Download Image";
    } catch (e) { dlBtn.innerText = "Error!"; }
}

function openLightbox(src) {
    lbImg.src = src;
    dlBtn.onclick = (e) => { e.stopPropagation(); forceDownload(src); };
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

lightbox.onclick = (e) => { if (e.target !== dlBtn) { lightbox.style.display = 'none'; document.body.style.overflow = 'auto'; } };