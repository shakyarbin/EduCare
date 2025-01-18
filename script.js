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