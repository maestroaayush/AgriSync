// Test browser location permission and geolocation
// Copy and paste this into your browser console

console.log('🧪 Testing Browser Location Permission...');

// Check if geolocation is supported
if (!navigator.geolocation) {
  console.error('❌ Geolocation is not supported by this browser');
} else {
  console.log('✅ Geolocation is supported');
  
  // Check current permission state
  if (navigator.permissions) {
    navigator.permissions.query({name: 'geolocation'}).then(function(result) {
      console.log('📍 Location permission state:', result.state);
      if (result.state === 'granted') {
        console.log('✅ Location permission is granted');
      } else if (result.state === 'prompt') {
        console.log('⚠️ Location permission will be prompted');
      } else if (result.state === 'denied') {
        console.log('❌ Location permission is denied');
        console.log('💡 Fix: Click the location icon in your address bar and allow location access');
      }
    });
  }
  
  // Test geolocation directly
  console.log('🔄 Testing geolocation...');
  
  const options = {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 0
  };
  
  navigator.geolocation.getCurrentPosition(
    function(position) {
      console.log('✅ Geolocation successful!');
      console.log('📍 Your coordinates:', position.coords.latitude, position.coords.longitude);
      console.log('📏 Accuracy:', position.coords.accuracy, 'meters');
      console.log('⏰ Timestamp:', new Date(position.timestamp));
      
      // Show on map
      console.log('🗺️ Google Maps link:', `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`);
    },
    function(error) {
      console.error('❌ Geolocation failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          console.log('💡 Fix: Enable location permission in browser settings');
          break;
        case error.POSITION_UNAVAILABLE:
          console.log('💡 Check: GPS/WiFi location services are enabled on your device');
          break;
        case error.TIMEOUT:
          console.log('💡 Try: Refreshing the page or checking your internet connection');
          break;
      }
    },
    options
  );
}

// Additional checks
console.log('🌐 Page URL:', window.location.href);
console.log('🔒 Is HTTPS:', window.location.protocol === 'https:');
console.log('🏠 Is localhost:', window.location.hostname === 'localhost');
