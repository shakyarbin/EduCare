function callNumber(phoneNumber) {
    window.location.href = `tel:${phoneNumber}`;
}

function sendSMS(phoneNumber) {
    navigator.geolocation.getCurrentPosition(position => {
        const mapLink = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
        const message = encodeURIComponent(`Emergency! Please check this location: ${mapLink}`);
        window.location.href = `sms:${phoneNumber}?body=${message}`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLocation = [position.coords.longitude, position.coords.latitude];
            
            // Initialize map
            const map = new maplibregl.Map({
                container: 'map',
                style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=T2ydav4L9diNGz0rJvDh',
                center: userLocation,
                zoom: 14
            });

            // Add navigation controls
            map.addControl(new maplibregl.NavigationControl());

            // Add user location marker (blue)
            new maplibregl.Marker({ color: '#2196F3' })
                .setLngLat(userLocation)
                .setPopup(new maplibregl.Popup().setHTML('<h3>Your Location</h3>'))
                .addTo(map);

            // Use Overpass API to find nearby hospitals
            const radius = 1000; // 1km radius
            const overpassQuery = `
                [out:json][timeout:25];
                (
                    // Search for hospitals, clinics, and pharmacies by name
                    node["name"~"[Hh]ospital|[Cc]linic|[Pp]harmacy"](around:${radius},${position.coords.latitude},${position.coords.longitude});
                    way["name"~"[Hh]ospital|[Cc]linic|[Pp]harmacy"](around:${radius},${position.coords.latitude},${position.coords.longitude});
                    
                    // Also get specifically tagged facilities
                    node["amenity"~"hospital|clinic|pharmacy"](around:${radius},${position.coords.latitude},${position.coords.longitude});
                    way["amenity"~"hospital|clinic|pharmacy"](around:${radius},${position.coords.latitude},${position.coords.longitude});
                    
                    // Include healthcare tagged facilities
                    node["healthcare"~"hospital|clinic"](around:${radius},${position.coords.latitude},${position.coords.longitude});
                    way["healthcare"~"hospital|clinic"](around:${radius},${position.coords.latitude},${position.coords.longitude});
                );
                out body;
                >;
                out skel qt;
            `;

            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

            fetch(overpassUrl)
                .then(response => response.json())
                .then(data => {
                    const buildings = data.elements.filter(element => 
                        element.tags && 
                        element.tags.name && 
                        (element.lat !== undefined && element.lon !== undefined)
                    );

                    console.log('Found buildings:', buildings);

                    // Filter and sort hospitals and clinics
                    const medicalFacilities = buildings.filter(building => {
                        if (!building.tags || !building.tags.name) return false;
                        
                        const name = building.tags.name.toLowerCase();
                        const isHospital = name.includes('hospital') || 
                                          building.tags.amenity === 'hospital' ||
                                          building.tags.healthcare === 'hospital';
                        const isClinic = name.includes('clinic') || 
                                        building.tags.amenity === 'clinic' ||
                                        building.tags.healthcare === 'clinic';
                        const isPharmacy = name.includes('pharmacy') || 
                                          building.tags.amenity === 'pharmacy';
                        
                        // Debug log
                        if (isHospital || isClinic || isPharmacy) {
                            console.log('Found facility:', {
                                name: building.tags.name,
                                tags: building.tags,
                                isHospital,
                                isClinic,
                                isPharmacy
                            });
                        }
                        
                        return isHospital || isClinic || isPharmacy;
                    }).sort((a, b) => {
                        // Sort to prioritize hospitals over clinics and pharmacies
                        const aIsHospital = a.tags.name.toLowerCase().includes('hospital');
                        const bIsHospital = b.tags.name.toLowerCase().includes('hospital');
                        return bIsHospital - aIsHospital;
                    });

                    medicalFacilities.forEach(facility => {
                        console.log('Medical Facility:', {
                            name: facility.tags.name,
                            lat: facility.lat,
                            lon: facility.lon
                        });

                        const coordinates = [facility.lon, facility.lat];
                        const name = facility.tags.name;
                        const type = getFacilityType(facility.tags);
                        
                        // Calculate distance from user location
                        const distance = calculateDistance(
                            position.coords.latitude, position.coords.longitude,
                            facility.lat, facility.lon
                        ).toFixed(1);

                        // Create custom marker element
                        const markerEl = document.createElement('div');
                        markerEl.innerHTML = `
                            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2" y="2" width="20" height="20" fill="white"/>
                                <path d="M5 5h14v14h-14z" fill="${getMarkerColor(type)}"/>
                                <path d="M11 7h2v10h-2z M7 11h10v2h-10z" fill="white"/>
                            </svg>
                        `;
                        markerEl.style.cssText = `
                            width: ${type === 'Hospital' ? '28px' : '24px'};
                            height: ${type === 'Hospital' ? '28px' : '24px'};
                            cursor: pointer;
                            background: white;
                            border-radius: 2px;
                            box-shadow: 0 0 4px rgba(0,0,0,0.3);
                            z-index: ${type === 'Hospital' ? '2' : '1'};
                        `;

                        // Add marker for facility
                        const marker = new maplibregl.Marker({
                            element: markerEl,
                            anchor: 'center'
                        })
                        .setLngLat(coordinates)
                        .setPopup(new maplibregl.Popup().setHTML(`
                            <h3>${name}</h3>
                            <p class="facility-type">${type}</p>
                            <p>${distance} km away</p>
                            <button onclick="callNumber('${getHospitalPhoneNumber(name)}')" class="call-btn">
                                <i class="fas fa-phone"></i> Call
                            </button>
                        `))
                        .addTo(map);

                        // Add to facility list
                        addFacilityToList(name, coordinates, distance, type);
                    });

                    // Fit map to show all markers
                    if (medicalFacilities.length > 0) {
                        const bounds = new maplibregl.LngLatBounds();
                        medicalFacilities.forEach(facility => {
                            bounds.extend([facility.lon, facility.lat]);
                        });
                        bounds.extend(userLocation);
                        map.fitBounds(bounds, { padding: 50 });
                    }
                })
                .catch(error => {
                    console.error('Error fetching hospitals:', error);
                });
        });
    }
});

// Add this function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Update the addHospitalToList function to handle facility types
function addFacilityToList(name, coordinates, distance, type) {
    const hospitalList = document.getElementById('hospitalList');
    const li = document.createElement('li');
    const phoneNumber = getHospitalPhoneNumber(name);
    
    li.innerHTML = `
        <div class="hospital-info">
            <i class="fas ${getFacilityIcon(type)}" style="color: ${getMarkerColor(type)}"></i>
            <div class="hospital-details">
                <span class="hospital-name">${name}</span>
                <span class="facility-type">${type}</span>
                <span class="hospital-distance">${distance} km away</span>
                <span class="hospital-phone">${phoneNumber}</span>
            </div>
        </div>
        <div class="hospital-buttons">
            <button onclick="callNumber('${phoneNumber}')" class="call-btn">
                <i class="fas fa-phone"></i> Call
            </button>
        </div>
    `;

    // Insert based on type priority
    if (type === 'Hospital') {
        hospitalList.insertBefore(li, hospitalList.firstChild);
    } else {
        hospitalList.appendChild(li);
    }
}

// Function to get hospital phone numbers
function getHospitalPhoneNumber(hospitalName) {
    const phoneNumbers = {
        "Manmohan Memorial Hospital": "+977 1-1234567",
        "Rusi Medical Hall": "+977 1-7654321",
        "Shankarapur Hospital": "+977 1-4993061",  // Updated with actual number if available
        "Nepal Orthopaedic Hospital": "+977 1-4494725",  // Updated with actual number if available
        // Add more hospitals and their phone numbers here
    };
    return phoneNumbers[hospitalName] || "Unknown"; // Return "Unknown" if not found
}

// Helper function to determine facility type
function getFacilityType(tags) {
    const name = tags.name.toLowerCase();
    if (name.includes('hospital') || tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'Hospital';
    if (name.includes('clinic') || tags.amenity === 'clinic' || tags.healthcare === 'clinic') return 'Clinic';
    if (name.includes('pharmacy') || tags.amenity === 'pharmacy') return 'Pharmacy';
    return 'Medical Facility';
}

// Helper function to get marker color
function getMarkerColor(type) {
    switch (type) {
        case 'Hospital': return '#FF0000';  // Bright red for hospitals
        case 'Clinic': return '#FF6B6B';    // Light red for clinics
        case 'Pharmacy': return '#4CAF50';  // Green for pharmacies
        default: return '#FF6B6B';
    }
}

// Helper function to get facility icon
function getFacilityIcon(type) {
    switch (type) {
        case 'Hospital': return 'fa-hospital';
        case 'Clinic': return 'fa-clinic-medical';
        case 'Pharmacy': return 'fa-prescription-bottle-medical';
        default: return 'fa-hospital';
    }
} 