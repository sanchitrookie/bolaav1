// Check server status periodically
document.addEventListener('DOMContentLoaded', function() {
    // Initial status check
    checkStatus();
    
    // Set up periodic status checking (every 10 seconds)
    setInterval(checkStatus, 10000);
});

/**
 * Check the server status and update the UI
 */
function checkStatus() {
    fetch('/status')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateStatusUI(data);
        })
        .catch(error => {
            console.error('Error checking status:', error);
            setStatusOffline();
        });
}

/**
 * Update the status UI elements based on the status response
 */
function updateStatusUI(data) {
    // Update overall status badge
    const statusBadge = document.getElementById('status-badge');
    statusBadge.textContent = 'Service Online';
    statusBadge.className = 'badge bg-success mb-3';
    
    // Update server status
    const serverStatus = document.getElementById('server-status');
    serverStatus.textContent = 'Online';
    serverStatus.className = 'ms-auto badge bg-success';
    
    // Update OpenAI API status
    const openaiStatus = document.getElementById('openai-status');
    if (data.openai_api === 'OK') {
        openaiStatus.textContent = 'Connected';
        openaiStatus.className = 'ms-auto badge bg-success';
    } else {
        openaiStatus.textContent = 'Issue: ' + data.openai_api;
        openaiStatus.className = 'ms-auto badge bg-warning';
    }
    
    // Update active calls
    const activeCallsElement = document.getElementById('active-calls');
    activeCallsElement.textContent = data.active_calls;
    activeCallsElement.className = 'ms-auto badge bg-info';
}

/**
 * Set all status indicators to offline state
 */
function setStatusOffline() {
    // Update overall status badge
    const statusBadge = document.getElementById('status-badge');
    statusBadge.textContent = 'Service Offline';
    statusBadge.className = 'badge bg-danger mb-3';
    
    // Update server status
    const serverStatus = document.getElementById('server-status');
    serverStatus.textContent = 'Offline';
    serverStatus.className = 'ms-auto badge bg-danger';
    
    // Update OpenAI API status
    const openaiStatus = document.getElementById('openai-status');
    openaiStatus.textContent = 'Unavailable';
    openaiStatus.className = 'ms-auto badge bg-danger';
    
    // Update active calls
    const activeCallsElement = document.getElementById('active-calls');
    activeCallsElement.textContent = '-';
    activeCallsElement.className = 'ms-auto badge bg-secondary';
}
