document.addEventListener("DOMContentLoaded", function () {
    const map = L.map("map").setView([36.2977, 59.6057], 13); // Mashhad
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let allSchools = [];
    let markers = [];
    let zonePolygons = [];
    let courseMap = {}; // برای نگهداری map رشته‌ها

    let activeFilters = {
        gender_specific_code: [],
        technical_or_vocational_code: [],
        public_or_private_code: [],
        selectedCourse: null,
        selectedZone: null,
        searchText: ""
    };

    function addMarkers(filteredSchools) {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
    
        filteredSchools.forEach(school => {
            const lat = parseFloat(school.latitude);
            const lng = parseFloat(school.longitude);
            if (isNaN(lat) || isNaN(lng)) return;
    
            const districtId = school.district;
    
            const icon = L.icon({
                iconUrl: `image/${districtId}-${school.gender_specific_code}.svg`,
                iconSize: [70, 70]
            });
    
            // ایمن‌سازی و ترجمه کد رشته‌ها
            const courseCodes = Array.isArray(school.cources)
                ? school.cources
                : typeof school.cources === "string"
                ? school.cources.split(",")
                : [];
    
            const courseNames = courseCodes
                .map(code => code.trim())
                .filter(code => code)
                .map(code => courseMap[code] || code)
                .join("، ");
    
            const popup = `
                <div class="popup">
                    هنرستان <b style="color: #33358a;">${school.school_name}</b> - ${school.districtN || ""}<br>
                    ${school.technical_or_vocational}، ${school.gender_specific}، ${school.public_or_private}<br>
                    <b>رشته‌های فعال: </b>${courseNames}<br>
                    <b>نشانی: </b>${school.address || ""}<br>
                    <b>تلفن: </b>${school.tel || ""}
                </div>
            `;
    
            const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popup);
            markers.push(marker);
        });
    }
    

    function fuzzyMatch(text, keyword) {
        if (!text || !keyword) return false;
        text = text.toLowerCase();
        const words = keyword.toLowerCase().split(/\s+/);
        return words.every(w => text.includes(w));
    }

    function applyFilters() {
        let filtered = [...allSchools];

        if (activeFilters.selectedZone) {
            filtered = filtered.filter(s => s.district === activeFilters.selectedZone);
        }

        if (activeFilters.selectedCourse) {
            filtered = filtered.filter(s => {
                const courseCodes = Array.isArray(s.cources)
                    ? s.cources
                    : typeof s.cources === "string"
                    ? s.cources.split(",")
                    : [];
        
                return courseCodes
                    .map(c => c.trim())
                    .includes(activeFilters.selectedCourse);
            });
        }
        
        filtered = filtered.filter(s =>
            (activeFilters.gender_specific_code.length === 0 || activeFilters.gender_specific_code.includes(s.gender_specific_code)) &&
            (activeFilters.technical_or_vocational_code.length === 0 || activeFilters.technical_or_vocational_code.includes(s.technical_or_vocational_code)) &&
            (activeFilters.public_or_private_code.length === 0 || activeFilters.public_or_private_code.includes(s.public_or_private_code))
        );

        const query = activeFilters.searchText.trim().toLowerCase();
        if (query) {
            filtered = filtered.filter(s =>
                fuzzyMatch(s.school_name || "", query) ||
                fuzzyMatch(s.cources || "", query) ||
                fuzzyMatch(s.address || "", query)
            );
        }

        addMarkers(filtered);
    }

    // بارگذاری فایل‌ها
    fetch("js/SchoolFilesIndex.json")
        .then(res => res.json())
        .then(schoolFileNames => {
            const schoolFetches = schoolFileNames.map(name =>
                fetch(`js/SchoolJson//${name}`).then(res => res.json())
            );

            return Promise.all([
                ...schoolFetches,
                fetch("js/cources.json").then(res => res.json())
            ]);
        })
        .then(allData => {
            const courseData = allData.pop(); // رشته‌ها
            const schoolDataList = allData;
        
            allSchools = schoolDataList.flatMap(data => {
                const key = Object.keys(data)[0];
                return data[key];
            });
        
            // ساخت map کد به نام رشته
            courseMap = {};
            Object.values(courseData).flat().forEach(c => {
                courseMap[c.code] = c.name;
            });
        
            //   مرحله ۱: جمع‌آوری کد رشته‌هایی که در هنرستان‌ها استفاده شده‌اند
            const usedCourseCodes = new Set();
            allSchools.forEach(s => {
                let codes = Array.isArray(s.cources)
                    ? s.cources
                    : typeof s.cources === "string"
                    ? s.cources.split(",")
                    : [];
        
                codes.map(c => c.trim()).filter(c => c).forEach(code => usedCourseCodes.add(code));
            });
        
            //   مرحله ۲: فقط رشته‌هایی که در هنرستان‌ها هستند
            const filteredCourses = Object.values(courseData).flat().filter(course =>
                usedCourseCodes.has(course.code)
            );
        
            //   مرحله ۳: پر کردن کمبوباکس رشته‌ها
            
const courseSelect = document.getElementById("courseSelect");
courseSelect.innerHTML = `<option value="" selected>انتخاب رشته</option>`;

filteredCourses.sort((a, b) => a.name.localeCompare(b.name, "fa"));
filteredCourses.forEach(course => {
    const option = document.createElement("option");
    option.value = course.code;
    option.textContent = course.name;
    courseSelect.appendChild(option);
});

// سپس فعال کردن Select2 روی select
$(document).ready(function() {
    $('#courseSelect').select2({
        placeholder: "انتخاب رشته",
        allowClear: true,
        width: '40%',
        dir: "rtl"
    });
});

// و اضافه کردن event listener برای فیلتر
$('#courseSelect').on('change', function () {
    const value = $(this).val();
    activeFilters.selectedCourse = value ? value : null;
    applyFilters();
});
        
            addMarkers(allSchools);
        })
        
        .catch(err => {
            console.error("خطا در بارگذاری فایل‌ها:", err);
        });

    // بارگذاری و رسم نواحی روی نقشه
    fetch("js/zonesRange.json")
        .then(res => res.json())
        .then(zones => {
            zones.forEach(zone => {
                const polygon = L.polygon(zone.coordinates, {
                    color: zone.color,
                    weight: 5,
                    fillColor: zone.color,
                    fillOpacity: 0.1
                }).addTo(map).bindPopup(`<b>${zone.name}</b>`);
                zonePolygons.push(polygon);
            });
        });

    // بارگذاری لیست نواحی
    fetch("js/zones.json")
        .then(res => res.json())
        .then(zones => {
            const zoneSelect = document.getElementById("zoneSelect");
            zoneSelect.innerHTML = `<option value="0" selected>تمامی نواحی</option>`;
            zones.forEach(zone => {
                const option = document.createElement("option");
                option.value = zone.id;
                option.textContent = zone.name;
                zoneSelect.appendChild(option);
            });

            zoneSelect.addEventListener("change", function () {
                activeFilters.selectedZone = this.value === "0" ? null : this.value;
                applyFilters();
            });
        });

    // فیلترهای دکمه‌ای
    document.querySelectorAll(".filter-btn").forEach(button => {
        button.addEventListener("click", function () {
            const value = this.dataset.filter;
            this.classList.toggle("active");

            const prefix = value[0];
            if (prefix === "G") toggleCodeFilter("gender_specific_code", value);
            if (prefix === "T") toggleCodeFilter("technical_or_vocational_code", value);
            if (prefix === "P") toggleCodeFilter("public_or_private_code", value);

            applyFilters();
        });
    });

    function toggleCodeFilter(key, value) {
        const arr = activeFilters[key];
        const i = arr.indexOf(value);
        if (i === -1) arr.push(value);
        else arr.splice(i, 1);
    }

    // جستجو زنده
    document.getElementById("search").addEventListener("input", function () {
        activeFilters.searchText = this.value.trim();
        applyFilters();
    });
});
