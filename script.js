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
    initMap();
});

function initMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            // Use actual user location as map center
            const userLocation = [position.coords.longitude, position.coords.latitude];
            
            // Initialize map centered on user location
            const map = new maplibregl.Map({
                container: 'map',
                style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=T2ydav4L9diNGz0rJvDh',
                center: userLocation,
                zoom: 14 // Slightly lower zoom to show more area
            });

            // Add navigation controls
            map.addControl(new maplibregl.NavigationControl());

            // Add user location marker
            new maplibregl.Marker({ color: '#2196F3' })
                .setLngLat(userLocation)
                .setPopup(new maplibregl.Popup().setHTML('<h3>Your Location</h3>'))
                .addTo(map);

            // Search for nearby hospitals
            map.on('load', () => {
                // Add a source for medical points
                map.addSource('medical', {
                    'type': 'geojson',
                    'data': {
                        'type': 'FeatureCollection',
                        'features': []
                    }
                });

                // Use Overpass API to find nearby medical facilities
                const radius = 2000; // 2km radius
                const overpassQuery = `
                    [out:json][timeout:25];
                    (
                        // Hospitals
                        node["amenity"="hospital"](around:${radius},${position.coords.latitude},${position.coords.longitude});
                        way["amenity"="hospital"](around:${radius},${position.coords.latitude},${position.coords.longitude});
                    );
                    out body;
                    >;
                    out skel qt;
                `;

                const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

                fetch(overpassUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (!data || !data.elements) {
                            throw new Error('No data received from Overpass API');
                        }
                        
                        const medicalFacilities = data.elements.filter(element => 
                            element.tags && 
                            element.tags.name && 
                            (element.lat !== undefined && element.lon !== undefined)
                        );

                        if (medicalFacilities.length === 0) {
                            document.getElementById('hospitalList').innerHTML = 
                                '<li class="no-results">No medical facilities found nearby. Try increasing the search radius.</li>';
                            return;
                        }

                        medicalFacilities.forEach(facility => {
                            const coordinates = [facility.lon, facility.lat];
                            const name = facility.tags.name;
                            const type = getFacilityType(facility.tags);
                            const markerColor = getMarkerColor(type);

                            // Create custom marker element
                            const markerElement = getMarkerElement(type);

                            // Add marker for medical facility
                            const marker = new maplibregl.Marker({
                                element: markerElement,
                                anchor: 'center'
                            })
                            .setLngLat(coordinates)
                            .addTo(map);

                            // Calculate distance
                            const distance = calculateDistance(
                                userLocation[1], userLocation[0],
                                coordinates[1], coordinates[0]
                            ).toFixed(1);

                            // Add popup to marker
                            marker.setPopup(new maplibregl.Popup().setHTML(`
                                <h3>${name}</h3>
                                <p><strong>${type}</strong></p>
                                <p>${distance} km away</p>
                            `));

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
                        console.error('Error details:', error);
                        document.getElementById('hospitalList').innerHTML = `
                            <li class="no-results">
                                <div class="error-message">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Unable to load nearby medical facilities. Please try again later.</p>
                                    <p class="error-details">Error: ${error.message}</p>
                                </div>
                            </li>`;
                    });
            });

        }, () => {
            handleLocationError(true);
        });
    } else {
        handleLocationError(false);
    }
}

// Helper function to determine facility type
function getFacilityType(tags) {
    if (tags.amenity === 'hospital') return 'Hospital';
    if (tags.amenity === 'clinic') return 'Clinic';
    if (tags.amenity === 'pharmacy') return 'Pharmacy';
    if (tags.healthcare === 'centre') return 'Medical Center';
    if (tags.healthcare === 'doctor') return 'Doctor';
    return 'Medical Facility';
}

// Helper function to get marker color based on facility type
function getMarkerColor(type) {
    switch (type) {
        case 'Hospital':
            return '#FF0000'; // Red
        case 'Clinic':
            return '#FF6B6B'; // Light red
        case 'Pharmacy':
            return '#4CAF50'; // Green
        case 'Medical Center':
            return '#FF9800'; // Orange
        case 'Doctor':
            return '#2196F3'; // Blue
        default:
            return '#9C27B0'; // Purple
    }
}

// Helper function to get marker size and style based on facility type
function getMarkerElement(type) {
    const div = document.createElement('div');
    div.className = 'custom-marker';
    
    if (type === 'Hospital') {
        // Hospital icon marker
        div.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 2H5C3.89543 2 3 2.89543 3 4V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V4C21 2.89543 20.1046 2 19 2Z" stroke="#FF0000" stroke-width="2"/>
            <path d="M12 8V16M8 12H16" stroke="#FF0000" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
        div.style.cssText = `
            width: 32px; /* Larger size */
            height: 32px; /* Larger size */
            background: white;
            border-radius: 4px;
            box-shadow: 0 0 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        `;
    } else {
        // Circular markers for other facilities (if needed)
        const size = '12px';
        const borderWidth = '2px';
        div.style.cssText = `
            width: ${size};
            height: ${size};
            background: white;
            border: ${borderWidth} solid ${getMarkerColor(type)};
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(0,0,0,0.3);
        `;
    }
    
    return div;
}

// Update the addFacilityToList function (previously addHospitalToList)
function addFacilityToList(name, coordinates, distance, type) {
    const hospitalList = document.getElementById('hospitalList');
    const li = document.createElement('li');
    
    // Assuming you have a way to get the phone number for the hospital
    const phoneNumber = getHospitalPhoneNumber(name); // Implement this function to retrieve the phone number

    li.innerHTML = `
        <div class="hospital-info">
            <i class="fas ${getFacilityIcon(type)}"></i>
            <div class="hospital-details">
                <span class="hospital-name">${name}</span>
                <span class="facility-type">${type}</span>
                <span class="hospital-distance">${distance} km away</span>
            </div>
        </div>
        <div class="hospital-buttons">
            <button onclick="callNumber('${phoneNumber}')" class="call-btn">
                <i class="fas fa-phone"></i> Call
            </button>
            <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${coordinates[1]},${coordinates[0]}', '_blank')" class="direction-btn">
                <i class="fas fa-directions"></i> Directions
            </button>
        </div>
    `;
    hospitalList.appendChild(li);
}

// Helper function to get appropriate icon for facility type
function getFacilityIcon(type) {
    switch (type) {
        case 'Hospital':
            return 'fa-hospital';
        case 'Clinic':
            return 'fa-clinic-medical';
        case 'Pharmacy':
            return 'fa-prescription-bottle-medical';
        case 'Medical Center':
            return 'fa-house-medical';
        case 'Doctor':
            return 'fa-user-doctor';
        default:
            return 'fa-heart-pulse';
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function handleLocationError(browserHasGeolocation) {
    alert(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
}

function callWithSpeech(phoneNumber, service) {
    if ('speechSynthesis' in window) {
        navigator.geolocation.getCurrentPosition(position => {
            const message = `Emergency! This is an automated emergency call. I need ${service} assistance. My current location is approximately latitude ${position.coords.latitude.toFixed(6)} and longitude ${position.coords.longitude.toFixed(6)}. Please send help immediately.`;
            
            const speech = new SpeechSynthesisUtterance(message);
            speech.rate = 0.9; // Slightly slower rate for clarity
            speech.pitch = 1;
            speech.volume = 1;
            
            speech.onend = () => {
                // After speech ends, initiate the call
                window.location.href = `tel:${phoneNumber}`;
            };
            
            window.speechSynthesis.speak(speech);
        }, () => {
            // If location access is denied, still make the call
            window.location.href = `tel:${phoneNumber}`;
        });
    } else {
        // If speech synthesis is not supported, just make the call
        window.location.href = `tel:${phoneNumber}`;
    }
}

function getHospitalPhoneNumber(hospitalName) {
    // Example: Return a hardcoded phone number based on the hospital name
    const phoneNumbers = {
        "Manmohan Memorial Hospital": "+977 1-1234567",
        "Rusi Medical Hall": "+977 1-7654321",
        // Add more hospitals and their phone numbers here
    };
    return phoneNumbers[hospitalName] || "Unknown"; // Return "Unknown" if not found
} 