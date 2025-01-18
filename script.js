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

// Sample nearby hospitals data with coordinates
const hospitals = [
    { 
        name: 'City Hospital', 
        phone: '+1234567891',
        coordinates: [-0.002, 0.002], // This will be relative to user's location
        distance: '0.5 km'
    },
    { 
        name: 'General Hospital', 
        phone: '+1234567892',
        coordinates: [0.004, -0.003],
        distance: '0.8 km'
    },
    { 
        name: 'Emergency Care Center', 
        phone: '+1234567893',
        coordinates: [-0.003, -0.004],
        distance: '1.2 km'
    }
];

document.addEventListener('DOMContentLoaded', () => {
    initMap();
});

function initMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLocation = [position.coords.longitude, position.coords.latitude];
            
            // Initialize map
            const map = new maplibregl.Map({
                container: 'map',
                style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=T2ydav4L9diNGz0rJvDh',
                center: userLocation,
                zoom: 14
            });

            // Add navigation controls
            map.addControl(new maplibregl.NavigationControl());

            // Add user location marker
            new maplibregl.Marker({ color: '#FF0000' })
                .setLngLat(userLocation)
                .setPopup(new maplibregl.Popup().setHTML('<h3>You are here</h3>'))
                .addTo(map);

            // Add hospital markers and populate list
            const hospitalList = document.getElementById('hospitalList');
            hospitalList.innerHTML = ''; // Clear existing list

            hospitals.forEach(hospital => {
                // Calculate actual coordinates based on user's location
                const hospitalCoords = [
                    userLocation[0] + hospital.coordinates[0],
                    userLocation[1] + hospital.coordinates[1]
                ];

                // Add marker for hospital
                new maplibregl.Marker({ color: '#4CAF50' })
                    .setLngLat(hospitalCoords)
                    .setPopup(new maplibregl.Popup().setHTML(`
                        <h3>${hospital.name}</h3>
                        <p>${hospital.distance}</p>
                    `))
                    .addTo(map);

                // Add hospital to list
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="hospital-info">
                        <i class="fas fa-hospital"></i>
                        <div class="hospital-details">
                            <span class="hospital-name">${hospital.name}</span>
                            <span class="hospital-distance">${hospital.distance}</span>
                        </div>
                    </div>
                    <button onclick="callNumber('${hospital.phone}')" class="call-btn">
                        <i class="fas fa-phone"></i> Call
                    </button>
                `;
                hospitalList.appendChild(li);
            });

        }, () => {
            handleLocationError(true);
        });
    } else {
        handleLocationError(false);
    }
}

function handleLocationError(browserHasGeolocation) {
    alert(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
} 