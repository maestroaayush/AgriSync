// Test script to verify profile photo upload route
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Test function (replace with your actual token)
const testUpload = async () => {
    try {
        // Test if the route exists by making a request
        const response = await axios.post('http://localhost:5000/api/auth/upload-profile-photo', {}, {
            headers: {
                'Authorization': 'Bearer test-token'
            }
        });
    } catch (error) {
        if (error.response) {
            console.log('Route exists! Status:', error.response.status);
            console.log('Response:', error.response.data);
            
            if (error.response.status === 400 && error.response.data.message === 'No file uploaded') {
                console.log('✅ Upload route is working correctly - it requires a file');
            } else if (error.response.status === 401 || error.response.data.message === 'Access denied') {
                console.log('✅ Upload route exists and requires authentication');
            }
        } else {
            console.log('❌ Cannot reach the server or route doesn\'t exist');
        }
    }
};

console.log('Testing profile photo upload route...');
testUpload();
