const SUPABASE_URL = 'https://lrlfnfuymbjdxixlttmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jddfRqXC9UkFaUOQ0n2O-Q_slOWTPIo';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- ELEMENTS ---
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const uploadModal = document.getElementById('uploadModal');
const grid = document.getElementById('photoInventory');
const followerList = document.getElementById('followerList'); // New element from our HTML

// --- 1. SESSION CHECK ---
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        loadManagementList(); 
        loadFollowers(); // Load your fans on entry
    }
}
checkUser();

// --- 2. THE UPLOAD ---
async function handleUpload() {
    const fileInput = document.getElementById('fileInput');
    const category = document.getElementById('categorySelect').value;
    const btn = document.getElementById('uploadBtn');

    if (!fileInput.files.length) return alert("Select at least one photo!");
    if (fileInput.files.length > 5) return alert("Please limit uploads to 5 at a time.");
    
    const files = Array.from(fileInput.files);
    btn.disabled = true;

    // We use a for...of loop so they upload one after another correctly
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        btn.innerText = `Uploading ${i + 1} of ${files.length}...`;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;

        // 1. Upload to STORAGE
        const { data: storageData, error: storageError } = await _supabase.storage
            .from('photos')
            .upload(fileName, file);

        if (storageError) {
            console.error("Storage Fail:", storageError);
            continue; // Skip this one if it fails and try the next
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = _supabase.storage.from('photos').getPublicUrl(fileName);

        // 3. Insert into DATABASE
        const { error: dbError } = await _supabase
            .from('photos')
            .insert([{ image_url: publicUrl, category: category, likes_count: 0 }]);
        
        if (dbError) console.error("Database Error:", dbError);
    }

    alert("Upload Process Complete!");
    btn.innerText = "Begin Upload";
    btn.disabled = false;
    fileInput.value = ""; // Clear the input
    toggleUploadModal(false);
    loadManagementList();
}

// --- 3. GALLERY & INSIGHTS LOADING ---
async function loadManagementList() {
    grid.innerHTML = '<p style="color:#666">Opening the lens...</p>';
    const { data, error } = await _supabase.from('photos').select('*').order('created_at', { ascending: false });
    
    if (error) return console.error(error);

    grid.innerHTML = '';
    data.forEach(photo => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        // Now displaying the "Silent Likes" only for you, the Admin
        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${photo.image_url}">
                <div class="admin-like-badge">❤️ ${photo.likes_count || 0}</div>
            </div>
            <div class="card-footer">
                <span class="cat-tag">${photo.category}</span>
                <button class="delete-btn" onclick="deletePhoto('${photo.id}', '${photo.image_url}')">Delete</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- 4. NEW: FOLLOWER LOGIC ---
async function loadFollowers() {
    if (!followerList) return;
    
    const { data, error } = await _supabase
        .from('followers')
        .select('fan_name, created_at')
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    followerList.innerHTML = '';
    if (data.length === 0) {
        followerList.innerHTML = '<p class="muted">No followers yet. Keep shooting!</p>';
        return;
    }

    data.forEach(fan => {
        const entry = document.createElement('div');
        entry.className = 'fan-entry';
        const date = new Date(fan.created_at).toLocaleDateString();
        entry.innerHTML = `<strong>${fan.fan_name}</strong> <small>${date}</small>`;
        followerList.appendChild(entry);
    });
}

// --- 5. DELETE & AUTH ---
async function deletePhoto(id, url) {
    if (!confirm("Destroy this record?")) return;
    
    await _supabase.from('photos').delete().eq('id', id);
    const fileName = url.split('/').pop();
    await _supabase.storage.from('photos').remove([fileName]);
    
    loadManagementList();
}

function toggleUploadModal(show) { uploadModal.classList.toggle('hidden', !show); }

async function handleLogin() {
    const { error } = await _supabase.auth.signInWithPassword({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    });
    error ? alert(error.message) : location.reload();
}

async function handleSignUp() {
    const { error } = await _supabase.auth.signUp({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    });
    error ? alert(error.message) : alert("Check your email for the confirmation link!");
}

// Keeping your handleLogout even though the button is removed, just in case you use console
function handleLogout() { _supabase.auth.signOut(); location.reload(); }