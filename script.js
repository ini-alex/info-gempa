document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json';
    const loadingEl = document.getElementById('loading');
    const themeToggle = document.getElementById('theme-toggle');

    // --- LOGIKA TOGGLE THEME ---
    const applyTheme = (theme) => { document.documentElement.setAttribute('data-theme', theme); };
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) { applyTheme(savedTheme); }
    themeToggle.addEventListener('click', () => {
        let currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? null : 'dark';
        if (newTheme) {
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem('theme');
        }
    });

    // --- Cek halaman mana yang sedang aktif ---
    if (document.getElementById('history-list-container')) { initIndexPage(); }
    if (document.getElementById('quake-detail-container')) { initDetailPage(); }

    // --- FUNGSI HALAMAN UTAMA (index.html) ---
    async function initIndexPage() {
        loadingEl.style.display = 'flex';
        const historyContainer = document.getElementById('history-list-container');
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Gagal mengambil data');
            const data = await response.json();
            const earthquakes = data.Infogempa.gempa;
            
            historyContainer.innerHTML = '';
            earthquakes.forEach(quake => {
                const item = document.createElement('a');
                item.className = 'history-item';
                item.href = `info-gempa.html?id=${encodeURIComponent(quake.DateTime)}`;
                item.innerHTML = `<div class="mag">${quake.Magnitude} M</div><div class="details"><div class="loc">${quake.Wilayah}</div><div class="time">${quake.Tanggal} ${quake.Jam}</div></div>`;
                historyContainer.appendChild(item);
            });
        } catch (error) {
            historyContainer.innerHTML = `<p>Gagal memuat daftar riwayat: ${error.message}</p>`;
        } finally {
            loadingEl.style.display = 'none';
        }
    }
    
    // --- FUNGSI HALAMAN DETAIL (info-gempa.html) ---
    async function initDetailPage() {
        loadingEl.style.display = 'flex';
        const detailContainer = document.getElementById('quake-detail-container');
        const params = new URLSearchParams(window.location.search);
        const quakeId = params.get('id');

        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Gagal mengambil data');
            const data = await response.json();
            const earthquakes = data.Infogempa.gempa;
            
            let quakeToShow = earthquakes[0]; 
            if (quakeId) {
                const foundQuake = earthquakes.find(q => q.DateTime === quakeId);
                if (foundQuake) quakeToShow = foundQuake;
            }
            
            renderDetailContent(quakeToShow);

        } catch (error) {
            detailContainer.innerHTML = `<p>Gagal memuat data gempa: ${error.message}</p>`;
        } finally {
            loadingEl.style.display = 'none';
        }
    }
    
    function renderDetailContent(quake) {
        const detailContainer = document.getElementById('quake-detail-container');
        detailContainer.innerHTML = `
            <div class="detail-grid">
                <div id="map"></div>
                <div class="featured-info">
                    <div class="magnitude">${quake.Magnitude} M</div>
                    <div class="location">${quake.Wilayah}</div>
                    <div class="info-grid">
                        <div class="info-item"><i class="far fa-calendar-alt"></i><div><span>Waktu</span><br><strong>${quake.Tanggal} ${quake.Jam}</strong></div></div>
                        <div class="info-item"><i class="fas fa-ruler-vertical"></i><div><span>Kedalaman</span><br><strong>${quake.Kedalaman}</strong></div></div>
                        <div class="info-item"><i class="fas fa-map-marker-alt"></i><div><span>Koordinat</span><br><strong>${quake.Coordinates}</strong></div></div>
                        <div class="info-item"><i class="fas fa-water"></i><div><span>Potensi</span><br><strong>${quake.Potensi || "Tidak diketahui"}</strong></div></div>
                    </div>
                    <div class="action-buttons">
                        <button id="view-json-btn" class="header-btn action-btn"><i class="fas fa-code"></i> Lihat JSON</button>
                        <button id="download-json-btn" class="header-btn action-btn"><i class="fas fa-file-download"></i> Unduh JSON</button>
                        <button id="generate-text-btn" class="header-btn action-btn primary"><i class="fas fa-file-alt"></i> Buat Info Teks</button>
                    </div>
                </div>
            </div>
        `;
        
        renderMap(quake);
        attachActionListeners(quake);
    }

    function renderMap(quake) {
        const [lat, lon] = quake.Coordinates.split(',');
        const map = L.map('map').setView([parseFloat(lat), parseFloat(lon)], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        L.marker([parseFloat(lat), parseFloat(lon)]).addTo(map)
            .bindPopup(`<b>${quake.Magnitude} M</b><br>${quake.Wilayah}`)
            .openPopup();
    }

    function attachActionListeners(quake) {
        // --- Event Listener untuk Modal JSON ---
        const jsonModal = document.getElementById('json-modal');
        const closeModalJsonBtn = document.getElementById('close-modal-json');
        const jsonContentPre = document.getElementById('json-content-pre');
        document.getElementById('view-json-btn').addEventListener('click', () => {
            jsonContentPre.textContent = JSON.stringify(quake, null, 2);
            jsonModal.classList.add('show');
        });
        closeModalJsonBtn.addEventListener('click', () => jsonModal.classList.remove('show'));

        // --- Event Listener untuk Download JSON ---
        document.getElementById('download-json-btn').addEventListener('click', () => {
            const dataStr = JSON.stringify(quake, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gempa-${quake.DateTime}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        // --- LOGIKA BARU UNTUK GENERATE & SHARE TEKS ---
        const textModal = document.getElementById('text-modal');
        const closeTextModalBtn = document.getElementById('close-modal-text');
        const generatedTextArea = document.getElementById('generated-text-area');
        const copyTextBtn = document.getElementById('copy-text-btn');
        const shareTextBtn = document.getElementById('share-text-btn');

        document.getElementById('generate-text-btn').addEventListener('click', () => {
            const generatedText = `
*Info Gempa Bumi Terkini!*

Kekuatan : *${quake.Magnitude} M*
Lokasi : *${quake.Wilayah}*
Waktu : ${quake.Tanggal} | ${quake.Jam}
Kedalaman : ${quake.Kedalaman}
Koordinat : ${quake.Coordinates}
Titik Gempa(maps): https://maps.google.com/maps?q=${quake.Coordinates}
Potensi : *${quake.Potensi || "Tidak Diketahui"}*

Sumber: BMKG
Info lebih detail: ${window.location.href}
Info gempa lain: https://update-gempa.vercel.app
            `.trim();

            generatedTextArea.value = generatedText;
            textModal.classList.add('show');
        });

        copyTextBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(generatedTextArea.value).then(() => {
                copyTextBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
                setTimeout(() => {
                    copyTextBtn.innerHTML = '<i class="fas fa-copy"></i> Salin Teks';
                }, 2000);
            });
        });

        shareTextBtn.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Info Gempa Bumi',
                    text: generatedTextArea.value,
                    
                }).catch(console.error);
            } else {
                alert('Fitur "Bagikan" hanya didukung di browser mobile (HP). Silakan salin teks secara manual.');
            }
        });

        closeTextModalBtn.addEventListener('click', () => textModal.classList.remove('show'));
        // Tutup modal jika klik di luar area kontennya
        [jsonModal, textModal].forEach(modal => {
            if(modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) modal.classList.remove('show');
                });
            }
        });
    }
});
