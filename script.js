document.addEventListener('DOMContentLoaded', () => {
    // Definisi URL API BMKG
    const API_URL_GEMPA_DIRASAKAN = 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json';
    const API_URL_GEMPA_TERKINI = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json'; // Ini biasanya >M5
    const API_URL_AUTOGEMPA = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json'; // Gempa terbaru

    const loadingEl = document.getElementById('loading');

    // --- LOGIKA TOGGLE THEME (Berlaku untuk semua halaman) ---
    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
    };
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }
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

    // --- Cek halaman mana yang sedang aktif untuk menjalankan fungsi yang sesuai ---
    // Pastikan ID elemennya ada di halaman tersebut
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
                    // Tutup semua konten lain yang sedang terbuka (opsional, bisa dihapus kalau mau beberapa terbuka)
                    document.querySelectorAll('.collapsible-content.active').forEach(openContent => {
                        openContent.classList.remove('active');
                        // Cari ikon yang sesuai untuk header konten yang ditutup
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

            // Handle Gempa Terbaru (Autogempa)
            if (responseAutogempa.ok) {
                const dataAutogempa = await responseAutogempa.json();
                const latestQuake = dataAutogempa.Infogempa.gempa; // Ini udah objek langsung
                if (latestQuake) {
                    renderLatestQuakeCard(latestQuake, latestQuakeCard);
                } else {
                    latestQuakeCard.innerHTML = `<p class="loading-text">Tidak ada data gempa terbaru.</p>`;
                }
            } else {
                latestQuakeCard.innerHTML = `<p class="loading-text">Gagal memuat gempa terbaru. (${responseAutogempa.status})</p>`;
            }
            
            // Handle 15 Gempa Terakhir Dirasakan
            if (responseDirasakan.ok) {
                const dataDirasakan = await responseDirasakan.json();
                const feltEarthquakes = dataDirasakan.Infogempa.gempa.slice(0, 15); // Ambil 15 terakhir
                renderQuakeList(feltEarthquakes, feltQuakesContainer);
            } else {
                feltQuakesContainer.innerHTML = `<p class="loading-text">Gagal memuat daftar gempa dirasakan. (${responseDirasakan.status})</p>`;
            }

            // Handle 15 Gempa Terkini (Magnitudo >5)
            if (responseTerkini.ok) {
                const dataTerkini = await responseTerkini.json();
                const majorEarthquakes = dataTerkini.Infogempa.gempa.slice(0, 15); // Ambil 15 terakhir
                renderQuakeList(majorEarthquakes, recentMajorQuakesContainer);
            } else {
                recentMajorQuakesContainer.innerHTML = `<p class="loading-text">Gagal memuat daftar gempa terkini. (${responseTerkini.status})</p>`;
            }

        } catch (error) {
            console.error('Error fetching earthquake data:', error);
            // Tampilkan pesan error di semua kontainer jika ada error umum
            latestQuakeCard.innerHTML = `<p class="loading-text">Gagal memuat data gempa: ${error.message}</p>`;
            feltQuakesContainer.innerHTML = `<p class="loading-text">Gagal memuat data gempa: ${error.message}</p>`;
            recentMajorQuakesContainer.innerHTML = `<p class="loading-text">Gagal memuat data gempa: ${error.message}</p>`;
        } finally {
            loadingEl.style.display = 'none';
        }
    }

    // Helper function untuk merender daftar gempa (digunakan oleh felt & major quakes)
    function renderQuakeList(quakes, container) {
        container.innerHTML = ''; // Kosongkan dulu
        if (quakes.length === 0) {
            container.innerHTML = `<p class="loading-text">Tidak ada data gempa untuk ditampilkan.</p>`;
            return;
        }
        quakes.forEach(quake => {
            const item = document.createElement('a');
            item.className = 'history-item';
            // PENTING: Menggunakan encodeURIComponent untuk DateTime
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

    // Helper function untuk merender kartu gempa terbaru (autogempa)
    function renderLatestQuakeCard(quake, container) {
        container.innerHTML = `
            <div class="card-content">
                <div class="card-magnitude">${quake.Magnitude} M</div>
                <div class="card-info">
                    <p><strong>Waktu:</strong> ${quake.Tanggal} ${quake.Jam}</p>
                    <p><strong>Lokasi:</strong> ${quake.Wilayah}</p>
                    <p><strong>Kedalaman:</strong> ${quake.Kedalaman}</p>
                    <p><strong>Koordinat:</strong> ${quake.Coordinates}</p>
                    <p><strong>Potensi Tsunami:</strong> ${quake.Potensi}</p>
                </div>
            </div>
            <a href="info-gempa.html?id=${encodeURIComponent(quake.DateTime)}" class="view-detail-btn">Lihat Detail & Map <i class="fas fa-arrow-right"></i></a>
        `;
    }
    
    // --- FUNGSI-FUNGSI UNTUK HALAMAN DETAIL (info-gempa.html) ---
    async function initDetailPage() {
        loadingEl.style.display = 'flex';
        const detailContainer = document.getElementById('quake-detail-container');
        const params = new URLSearchParams(window.location.search);
        const quakeIdEncoded = params.get('id'); // ID yang masih di-encode

        try {
            // Kita coba fetch dari semua sumber untuk memastikan data ditemukan
            const [responseDirasakan, responseTerkini, responseAutogempa] = await Promise.all([
                fetch(API_URL_GEMPA_DIRASAKAN),
                fetch(API_URL_GEMPA_TERKINI),
                fetch(API_URL_AUTOGEMPA) 
            ]);

            let allEarthquakes = [];
            // Gabungkan data dari semua API
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
                // autogempa.json kadang langsung objek gempa, kadang array 1 elemen
                if (Array.isArray(dataAutogempa.Infogempa.gempa)) {
                    allEarthquakes = allEarthquakes.concat(dataAutogempa.Infogempa.gempa);
                } else if (dataAutogempa.Infogempa.gempa) {
                    allEarthquakes.push(dataAutogempa.Infogempa.gempa);
                }
            }
            
            // Filter duplikat berdasarkan DateTime
            // Menggunakan Map untuk memastikan keunikan berdasarkan DateTime
            const uniqueEarthquakesMap = new Map();
            allEarthquakes.forEach(item => {
                if (item.DateTime) { // Pastikan DateTime ada
                    uniqueEarthquakesMap.set(item.DateTime, item);
                }
            });
            const uniqueEarthquakes = Array.from(uniqueEarthquakesMap.values());
            
            // Decode ID dari URL
            const decodedQuakeDateTime = decodeURIComponent(quakeIdEncoded || ''); // Handle jika ID kosong

            let quakeToShow = null;
            if (decodedQuakeDateTime) {
                // Cari gempa berdasarkan decoded DateTime
                quakeToShow = uniqueEarthquakes.find(q => q.DateTime === decodedQuakeDateTime);
            } else {
                // Jika tidak ada ID di URL, tampilkan gempa terbaru dari autogempa (jika ada)
                // Ini akan jadi default behavior jika user langsung buka info-gempa.html tanpa ID
                const autoGempaRes = await fetch(API_URL_AUTOGEMPA);
                if(autoGempaRes.ok) {
                    const autoGempaData = await autoGempaRes.json();
                    if(autoGempaData.Infogempa.gempa) {
                        quakeToShow = autoGempaData.Infogempa.gempa;
                    }
                }
            }

            if (quakeToShow) {
                 renderDetailContent(quakeToShow);
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
        
        // Render Peta
        const [lat, lon] = quake.Coordinates.split(',');
        const map = L.map('map').setView([parseFloat(lat), parseFloat(lon)], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        L.marker([parseFloat(lat), parseFloat(lon)]).addTo(map)
            .bindPopup(`<b>${quake.Magnitude} M</b><br>${quake.Wilayah}`)
            .openPopup();

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
            
            // Langsung set display block, lalu kasih delay sedikit untuk animasi
            outputBox.style.display = 'block'; 
            // Menggunakan requestAnimationFrame untuk memastikan display block sudah diterapkan
            // sebelum transisi dipicu
            requestAnimationFrame(() => {
                outputBox.classList.add('show'); 
            });
            
            generateBtn.style.display = 'none'; // Sembunyikan tombol generate setelah diklik
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
                }, 3000); // Hapus pesan setelah 3 detik
            }
        });

        shareBtn.addEventListener('click', async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `Info Gempa ${quake.Magnitude} M di ${quake.Wilayah}`,
                        text: generateQuakeInfoText(quake),
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

    function generateQuakeInfoText(quake) {
        return `
INFO GEMPA TERKINI

Lokasi        : ${quake.Wilayah}
Waktu         : ${quake.Tanggal} ${quake.Jam} WIB
Koordinat     : ${quake.Coordinates}
Titik Gempa   : https://maps.google.com/maps?q=${quake.Coordinates}
Kedalaman     : ${quake.Kedalaman}
Magnitude     : ${quake.Magnitude} M
Potensi       : ${quake.Potensi}

Sumber        : BMKG Indonesia
Detail        : ${window.location.href}
Info lainnya  : https://update-gempa.vercel.app
`.trim(); // .trim() buat ngilangin spasi di awal/akhir
    }
});
