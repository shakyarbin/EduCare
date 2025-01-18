function callNumber(phoneNumber) {
    window.location.href = `tel:${phoneNumber}`;
}

function sendSMS(phoneNumber) {
    const message = encodeURIComponent("Emergency! Please check this location: https://maps.google.com/?q=your_location");
    window.location.href = `sms:${phoneNumber}?body=${message}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const hospitalList = document.getElementById('hospitalList');
    const hospitals = [
        { name: 'City Hospital', phone: '+1234567891' },
        { name: 'General Hospital', phone: '+1234567892' }
        // Add more hospitals as needed
    ];

    hospitals.forEach(hospital => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${hospital.name}</span>
            <button onclick="callNumber('${hospital.phone}')">Call</button>
        `;
        hospitalList.appendChild(li);
    });
});

function initMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            const map = new google.maps.Map(document.getElementById('map'), {
                center: userLocation,
                zoom: 15
            });
            new google.maps.Marker({
                position: userLocation,
                map: map
            });
        }, () => {
            handleLocationError(true, map.getCenter());
        });
    } else {
        handleLocationError(false, map.getCenter());
    }
}

function handleLocationError(browserHasGeolocation, pos) {
    alert(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
} 