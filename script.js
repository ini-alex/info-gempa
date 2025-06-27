document.addEventListener('DOMContentLoaded', () => {
    // Definisi URL API BMKG
    const API_URL_GEMPA_DIRASAKAN = 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json';
    const API_URL_GEMPA_TERKINI = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json'; // Ini biasanya >M5
    const API_URL_AUTOGEMPA = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json'; // Gempa terbaru

    const loadingEl = document.getElementById('loading');

    // Variabel global untuk instance map dan data gempa di halaman detail
    let currentMapInstance = null;
    let currentQuakeData = null;

    // --- LOGIKA TOGGLE THEME (Berlaku untuk semua halaman) ---
    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        // Kalau kita di halaman detail gempa, update juga tile map-nya
        if (document.getElementById('quake-detail-container') && currentMapInstance && currentQuakeData) {
            updateMapTileLayer(theme);
        }
    };
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }
    themeToggle.addEventListener('click', () => {
        let currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? null : 'dark'; // Toggle ke light (null) atau dark
        if (newTheme) {
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        } else {
            document.documentElement.removeAttribute('data-theme'); // Hapus atribut untuk kembali ke light default
            localStorage.removeItem('theme');
            applyTheme(null); // Terapkan tema light
        }
    });

    // --- FUNGSI UNTUK MENGGANTI TILE LAYER MAP SAAT TEMA BERUBAH ---
    function updateMapTileLayer(theme) {
        if (!currentMapInstance || !currentQuakeData) return;

        let tileUrl, attributionText;

        // Pilih tile layer berdasarkan tema
        if (theme === 'dark') {
            tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
            attributionText = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CartoDB</a>';
        } else { // light theme atau default
            tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
            attributionText = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CartoDB</a>';
        }

        // Hapus tile layer yang lama (jika ada)
        currentMapInstance.eachLayer(function(layer) {
            if (layer instanceof L.TileLayer) {
                currentMapInstance.removeLayer(layer);
            }
        });

        // Tambahkan tile layer yang baru
        L.tileLayer(tileUrl, { attribution: attributionText }).addTo(currentMapInstance);
    }

    // --- Cek halaman mana yang sedang aktif untuk menjalankan fungsi yang sesuai ---
    if (document.getElementById('latest-quake-card') || document.getElementById('felt-quakes-list-container')) {
        initIndexPage();
        setupCollapsibles(); // Panggil fungsi setup collapsible hanya di index.html
    }
    if (document.getElementById('quake-detail-container')) {
        initDetailPage();
    }

    // --- FUNGSI UNTUK SETUP COLLAPSIBLE DI INDEX.HTML ---
    function setupCollapsibles() {
        const toggleHeaders = document.querySelectorAll('.toggle-header');
        toggleHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const targetId = header.dataset.target;
                const content = document.getElementById(targetId);
                const icon = header.querySelector('.chevron-icon');

                if (content.classList.contains('active')) {
                    content.classList.remove('active');
                    icon.classList.remove('active');
                } else {
                    document.querySelectorAll('.collapsible-content.active').forEach(openContent => {
                        openContent.classList.remove('active');
                        const correspondingHeader = document.querySelector(`[data-target="${openContent.id}"]`);
                        if (correspondingHeader) {
                            const correspondingIcon = correspondingHeader.querySelector('.chevron-icon');
                            if (correspondingIcon) {
                                correspondingIcon.classList.remove('active');
                            }
                        }
                    });

                    content.classList.add('active');
                    icon.classList.add('active');
                }
            });
        });
    }

    // --- FUNGSI-FUNGSI UNTUK HALAMAN UTAMA (index.html) ---
    async function initIndexPage() {
        loadingEl.style.display = 'flex';
        const feltQuakesContainer = document.getElementById('felt-quakes-list-container');
        const recentMajorQuakesContainer = document.getElementById('recent-major-quakes-list-container');
        const latestQuakeCard = document.getElementById('latest-quake-card');

        try {
            const [responseDirasakan, responseTerkini, responseAutogempa] = await Promise.all([
                fetch(API_URL_GEMPA_DIRASAKAN),
                fetch(API_URL_GEMPA_TERKINI),
                fetch(API_URL_AUTOGEMPA)
            ]);

            if (responseAutogempa.ok) {
                const dataAutogempa = await responseAutogempa.json();
                const latestQuake = dataAutogempa.Infogempa.gempa;
                if (latestQuake) {
                    renderLatestQuakeCard(latestQuake, latestQuakeCard);
                } else {
                    latestQuakeCard.innerHTML = `<p class="loading-text">Tidak ada data gempa terbaru.</p>`;
                }
            } else {
                latestQuakeCard.innerHTML = `<p class="loading-text">Gagal memuat gempa terbaru. (${responseAutogempa.status})</p>`;
            }
            
            if (responseDirasakan.ok) {
                const dataDirasakan = await responseDirasakan.json();
                const feltEarthquakes = dataDirasakan.Infogempa.gempa.slice(0, 15);
                renderQuakeList(feltEarthquakes, feltQuakesContainer);
            } else {
                feltQuakesContainer.innerHTML = `<p class="loading-text">Gagal memuat daftar gempa dirasakan. (${responseDirasakan.status})</p>`;
            }

            if (responseTerkini.ok) {
                const dataTerkini = await responseTerkini.json();
                const majorEarthquakes = dataTerkini.Infogempa.gempa.slice(0, 15);
                renderQuakeList(majorEarthquakes, recentMajorQuakesContainer);
            } else {
                recentMajorQuakesContainer.innerHTML = `<p class="loading-text">Gagal memuat daftar gempa terkini. (${responseTerkini.status})</p>`;
            }

        } catch (error) {
            console.error('Error fetching earthquake data:', error);
            latestQuakeCard.innerHTML = `<p class="loading-text">Gagal memuat data gempa: ${error.message}</p>`;
            feltQuakesContainer.innerHTML = `<p class="loading-text">Gagal memuat data gempa: ${error.message}</p>`;
            recentMajorQuakesContainer.innerHTML = `<p class="loading-text">Gagal memuat data gempa: ${error.message}</p>`;
        } finally {
            loadingEl.style.display = 'none';
        }
    }

    function renderQuakeList(quakes, container) {
        container.innerHTML = '';
        if (quakes.length === 0) {
            container.innerHTML = `<p class="loading-text">Tidak ada data gempa untuk ditampilkan.</p>`;
            return;
        }
        quakes.forEach(quake => {
            const item = document.createElement('a');
            item.className = 'history-item';
            item.href = `info-gempa.html?id=${encodeURIComponent(quake.DateTime)}`; 
            item.innerHTML = `
                <div class="mag">${quake.Magnitude} M</div>
                <div class="details">
                    <div class="loc">${quake.Wilayah}</div>
                    <div class="time">${quake.Tanggal} ${quake.Jam}</div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    function renderLatestQuakeCard(quake, container) {
        container.innerHTML = `
            <div class="card-content">
                <div class="card-magnitude">${quake.Magnitude} M</div>
                <div class="card-info">
                    <p><strong>Waktu:</strong> ${quake.Tanggal} ${quake.Jam}</p>
                    <p><strong>Lokasi:</strong> ${quake.Wilayah}</p>
                    <p><strong>Kedalaman:</strong> ${quake.Kedalaman}</p>
                    <p><strong>Koordinat:</strong> ${quake.Coordinates}</p>
                    <p><strong>Potensi Tsunami:</strong> ${quake.Potensi || "Belum Ditentukan"}</p>
                </div>
            </div>
            <a href="info-gempa.html?id=${encodeURIComponent(quake.DateTime)}" class="view-detail-btn">Lihat Detail & Map <i class="fas fa-arrow-right"></i></a>
        `;
    }
    
    async function initDetailPage() {
        loadingEl.style.display = 'flex';
        const detailContainer = document.getElementById('quake-detail-container');
        const params = new URLSearchParams(window.location.search);
        const quakeIdEncoded = params.get('id'); 

        try {
            const [responseDirasakan, responseTerkini, responseAutogempa] = await Promise.all([
                fetch(API_URL_GEMPA_DIRASAKAN),
                fetch(API_URL_GEMPA_TERKINI),
                fetch(API_URL_AUTOGEMPA) 
            ]);

            let allEarthquakes = [];
            if (responseDirasakan.ok) {
                const dataDirasakan = await responseDirasakan.json();
                allEarthquakes = allEarthquakes.concat(dataDirasakan.Infogempa.gempa || []);
            }
            if (responseTerkini.ok) {
                const dataTerkini = await responseTerkini.json();
                allEarthquakes = allEarthquakes.concat(dataTerkini.Infogempa.gempa || []);
            }
            if (responseAutogempa.ok) { 
                const dataAutogempa = await responseAutogempa.json();
                if (Array.isArray(dataAutogempa.Infogempa.gempa)) {
                    allEarthquakes = allEarthquakes.concat(dataAutogempa.Infogempa.gempa);
                } else if (dataAutogempa.Infogempa.gempa) {
                    allEarthquakes.push(dataAutogempa.Infogempa.gempa);
                }
            }
            
            const uniqueEarthquakesMap = new Map();
            allEarthquakes.forEach(item => {
                if (item.DateTime) { 
                    uniqueEarthquakesMap.set(item.DateTime, item);
                }
            });
            const uniqueEarthquakes = Array.from(uniqueEarthquakesMap.values());
            
            const decodedQuakeDateTime = decodeURIComponent(quakeIdEncoded || ''); 

            let quakeToShow = null;
            if (decodedQuakeDateTime) {
                quakeToShow = uniqueEarthquakes.find(q => q.DateTime === decodedQuakeDateTime);
            } else {
                const autoGempaRes = await fetch(API_URL_AUTOGEMPA);
                if(autoGempaRes.ok) {
                    const autoGempaData = await autoGempaRes.json();
                    if(autoGempaData.Infogempa.gempa) {
                        quakeToShow = autoGempaData.Infogempa.gempa;
                    }
                }
            }

            if (quakeToShow) {
                 currentQuakeData = quakeToShow; // Simpan data gempa yang sedang ditampilkan
                 renderDetailContent(quakeToShow); // Render pertama kali dengan tema saat ini
                 
                 // Inisialisasi map instance setelah render HTML awal
                 const [lat, lon] = quakeToShow.Coordinates.split(',');
                 // Pastikan map belum diinisialisasi untuk menghindari error "Map container is already initialized"
                 if (currentMapInstance) { 
                     currentMapInstance.remove(); // Hapus instance map lama jika ada
                 }
                 currentMapInstance = L.map('map').setView([parseFloat(lat), parseFloat(lon)], 7);
                 
                 // Terapkan tile layer awal sesuai tema saat ini
                 const initialTheme = document.documentElement.getAttribute('data-theme');
                 updateMapTileLayer(initialTheme); // Panggil untuk set tile layer awal
                 
                 // Tambahkan marker ke map yang sudah diinisialisasi
                 L.marker([parseFloat(lat), parseFloat(lon)]).addTo(currentMapInstance)
                     .bindPopup(`<b>${quakeToShow.Magnitude} M</b><br>${quakeToShow.Wilayah}`)
                     .openPopup();

            } else {
                 detailContainer.innerHTML = `<p class="loading-text">Data gempa tidak ditemukan untuk ID ini atau terjadi kesalahan saat memuat.</p>`;
                 console.warn("Could not find earthquake with DateTime:", decodedQuakeDateTime);
            }

        } catch (error) {
            detailContainer.innerHTML = `<p class="loading-text">Gagal memuat data gempa: ${error.message}</p>`;
            console.error('Error in initDetailPage:', error);
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
                        <div class="info-item"><i class="fas fa-water"></i><div><span>Potensi</span><br><strong>${quake.Potensi}</strong></div></div>
                    </div>
                </div>
            </div>
            
            <div class="action-section">
                <h3>Bagikan Informasi Gempa Ini</h3>
                <p>Klik tombol di bawah untuk menyalin atau membagikan ringkasan informasi gempa.</p>
                <button id="generate-info-btn" class="primary-btn"><i class="fas fa-file-alt"></i> Buat Ringkasan Teks</button>
                <div id="generated-text-output" class="generated-text-box" style="display: none;">
                    <textarea id="info-text-area" readonly></textarea>
                    <div class="output-actions">
                        <button id="copy-text-btn" class="secondary-btn"><i class="fas fa-copy"></i> Salin Teks</button>
                        <button id="share-btn" class="secondary-btn"><i class="fas fa-share-alt"></i> Bagikan</button>
                    </div>
                    <p id="copy-feedback" class="feedback-msg"></p>
                </div>
            </div>
        `;
        
        // --- Logic untuk Generate Info Text, Copy, dan Share ---
        const generateBtn = document.getElementById('generate-info-btn');
        const outputBox = document.getElementById('generated-text-output');
        const textArea = document.getElementById('info-text-area');
        const copyBtn = document.getElementById('copy-text-btn');
        const shareBtn = document.getElementById('share-btn');
        const copyFeedback = document.getElementById('copy-feedback');

        generateBtn.addEventListener('click', () => {
            const infoText = generateQuakeInfoText(quake);
            textArea.value = infoText;
            
            outputBox.style.display = 'block'; 
            requestAnimationFrame(() => {
                outputBox.classList.add('show'); 
            });
            
            generateBtn.style.display = 'none'; 
            textArea.focus();
            textArea.select();
        });

        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(textArea.value);
                copyFeedback.textContent = 'Teks berhasil disalin!';
                copyFeedback.style.color = 'green';
            } catch (err) {
                copyFeedback.textContent = 'Gagal menyalin teks.';
                copyFeedback.style.color = 'red';
                console.error('Gagal menyalin: ', err);
            } finally {
                setTimeout(() => {
                    copyFeedback.textContent = '';
                }, 3000); 
            }
        });

        shareBtn.addEventListener('click', async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `Info Gempa ${quake.Magnitude} M di ${quake.Wilayah}`,
                        text: generateQuakeInfoText(quake) 
                    });
                    console.log('Konten berhasil dibagikan');
                } catch (error) {
                    console.error('Gagal membagikan:', error);
                }
            } else {
                alert('Fitur bagikan tidak didukung di browser ini. Silakan salin teksnya secara manual.');
            }
        });
    }

    // Fungsi generateQuakeInfoText dengan format baru
    function generateQuakeInfoText(quake) {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${quake.Coordinates}`;
        return `
INFO GEMPA TERKINI

Lokasi: *${quake.Wilayah}*
Waktu: *${quake.Tanggal} ${quake.Jam} WIB*
Koordinat: *${quake.Coordinates}*
Titik Gempa: *${googleMapsUrl}*
Kedalaman: *${quake.Kedalaman}*
Magnitude: *${quake.Magnitude} M*
Potensi: *${quake.Potensi || "Belum Ditentukan"}*

Sumber: *BMKG Indonesia*
Detail: *${window.location.href}*
Info lainnya: *https://update-gempa.vercel.app*
`.trim();
    }
});
