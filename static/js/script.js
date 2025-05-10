// Check server status periodically
document.addEventListener('DOMContentLoaded', function() {
    // Initial status check
    checkStatus();
    
    // Set up periodic status checking (every 10 seconds)
    setInterval(checkStatus, 10000);
    
    // Set up call button
    const callButton = document.getElementById('call-button');
    if (callButton) {
        callButton.addEventListener('click', initiateCall);
    }
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
    statusBadge.className = 'badge bg-primary mb-3';
    
    // Update server status
    const serverStatus = document.getElementById('server-status');
    serverStatus.textContent = 'Online';
    serverStatus.className = 'ms-auto badge bg-primary';
    
    // Update OpenAI API status
    const openaiStatus = document.getElementById('openai-status');
    const openaiDetails = document.getElementById('openai-details');
    const modelElement = document.getElementById('model-status');
    
    // Update model info if available
    if (modelElement && data.model) {
        modelElement.textContent = data.model;
        
        if (data.model.includes('gpt-4o')) {
            modelElement.className = 'ms-auto badge bg-primary';
        } else if (data.model.includes('gpt-3.5')) {
            modelElement.className = 'ms-auto badge bg-primary';
        } else {
            modelElement.className = 'ms-auto badge bg-secondary';
        }
    }
    
    if (data.openai_api === 'OK') {
        openaiStatus.textContent = 'Connected';
        openaiStatus.className = 'ms-auto badge bg-primary';
        if (openaiDetails) {
            openaiDetails.textContent = '';
            openaiDetails.classList.add('d-none');
        }
    } else if (data.openai_api === 'FALLBACK MODE') {
        openaiStatus.textContent = 'Using Fallback';
        openaiStatus.className = 'ms-auto badge bg-warning';
        if (openaiDetails) {
            openaiDetails.textContent = 'Primary model (GPT-4o) is unavailable. Using GPT-3.5-turbo as fallback.';
            openaiDetails.className = 'form-text text-warning small mt-1';
            openaiDetails.classList.remove('d-none');
        }
    } else if (data.openai_api === 'QUOTA EXCEEDED') {
        openaiStatus.textContent = 'Quota Exceeded';
        openaiStatus.className = 'ms-auto badge bg-danger';
        if (openaiDetails) {
            openaiDetails.textContent = 'The OpenAI API quota has been exceeded. Voice calls will not receive AI responses until the quota resets.';
            openaiDetails.className = 'form-text text-danger small mt-1';
            openaiDetails.classList.remove('d-none');
        }
    } else if (data.openai_api === 'RATE LIMITED') {
        openaiStatus.textContent = 'Rate Limited';
        openaiStatus.className = 'ms-auto badge bg-warning';
        if (openaiDetails) {
            openaiDetails.textContent = 'The OpenAI API is currently rate limited. Calls may experience delays or errors.';
            openaiDetails.className = 'form-text text-warning small mt-1';
            openaiDetails.classList.remove('d-none');
        }
    } else if (data.openai_api === 'ALL MODELS UNAVAILABLE') {
        openaiStatus.textContent = 'All Models Unavailable';
        openaiStatus.className = 'ms-auto badge bg-danger';
        if (openaiDetails) {
            openaiDetails.textContent = 'Both GPT-4o and GPT-3.5-turbo models are unavailable. Voice functionality will not work.';
            openaiDetails.className = 'form-text text-danger small mt-1';
            openaiDetails.classList.remove('d-none');
        }
    } else {
        openaiStatus.textContent = 'Issue: ' + data.openai_api;
        openaiStatus.className = 'ms-auto badge bg-warning';
        if (openaiDetails) {
            openaiDetails.textContent = 'The OpenAI API is experiencing issues. Voice functionality may be limited.';
            openaiDetails.className = 'form-text text-warning small mt-1';
            openaiDetails.classList.remove('d-none');
        }
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
    
    // Update model status
    const modelElement = document.getElementById('model-status');
    if (modelElement) {
        modelElement.textContent = 'Unavailable';
        modelElement.className = 'ms-auto badge bg-secondary';
    }
    
    // Update API details message
    const openaiDetails = document.getElementById('openai-details');
    if (openaiDetails) {
        openaiDetails.textContent = 'Server connection lost. Please check if the server is running.';
        openaiDetails.className = 'form-text text-danger small mt-1';
        openaiDetails.classList.remove('d-none');
    }
    
    // Update active calls
    const activeCallsElement = document.getElementById('active-calls');
    activeCallsElement.textContent = '-';
    activeCallsElement.className = 'ms-auto badge bg-secondary';
}

/**
 * Initiate an outbound call to the specified phone number
 */
function initiateCall() {
    const phoneInput = document.getElementById('phone-number');
    const callStatus = document.getElementById('call-status');
    const callButton = document.getElementById('call-button');
    
    // Validate phone number format (basic check)
    const phoneNumber = phoneInput.value.trim();
    if (!phoneNumber.startsWith('+')) {
        showCallStatus('error', 'Phone number must start with + and include country code');
        return;
    }
    
    // Disable button and show loading state
    callButton.disabled = true;
    callButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Calling...';
    
    // Make request to initiate call
    fetch(`/callme?number=${encodeURIComponent(phoneNumber)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                showCallStatus('success', `${data.message} Call ID: ${data.call_sid}`);
            } else {
                showCallStatus('error', data.message);
            }
        })
        .catch(error => {
            console.error('Error initiating call:', error);
            showCallStatus('error', `Failed to initiate call: ${error.message}`);
        })
        .finally(() => {
            // Re-enable button
            callButton.disabled = false;
            callButton.innerHTML = '<i data-feather="phone-outgoing" class="me-1"></i> Call Me';
            feather.replace(); // Refresh icons
        });
}

/**
 * Display call status message
 */
function showCallStatus(type, message) {
    const callStatus = document.getElementById('call-status');
    
    // Add verification link if needed
    if (type === 'error' && message.includes('not verified')) {
        const link = document.createElement('a');
        link.href = 'https://www.twilio.com/console/phone-numbers/verified';
        link.target = '_blank';
        link.className = 'alert-link';
        link.textContent = 'Verify this number in your Twilio console';
        
        callStatus.textContent = message + ' ';
        callStatus.appendChild(link);
    } else {
        callStatus.textContent = message;
    }
    
    callStatus.className = `alert mt-2 ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
    callStatus.classList.remove('d-none');
    
    // Auto-hide after 15 seconds for more time to read
    setTimeout(() => {
        callStatus.classList.add('d-none');
    }, 15000);
}
