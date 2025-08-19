// Quick test to check route API data
// Run this in browser console when logged in as transporter

console.log('🧪 Testing Route API...');

// Get deliveries first
fetch('http://localhost:5000/api/deliveries', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(deliveries => {
  console.log('📦 Found deliveries:', deliveries.length);
  
  if (deliveries.length > 0) {
    const testDelivery = deliveries[0];
    console.log('🎯 Testing with delivery:', testDelivery._id);
    console.log('📍 Pickup Location:', testDelivery.pickupLocation);
    console.log('🏭 Dropoff Location:', testDelivery.dropoffLocation);
    console.log('📊 Pickup Coords:', testDelivery.pickupCoordinates);
    console.log('📊 Dropoff Coords:', testDelivery.dropoffCoordinates);
    
    // Test route API
    return fetch(`http://localhost:5000/api/delivery/${testDelivery._id}/route`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    });
  } else {
    throw new Error('No deliveries found');
  }
})
.then(r => r.json())
.then(routeData => {
  console.log('🗺️ Route API Response:', routeData);
  
  if (routeData.success) {
    console.log('✅ Route API working!');
    console.log('📍 Pickup coordinates:', routeData.route.pickup?.coordinates);
    console.log('🏭 Delivery coordinates:', routeData.route.delivery?.coordinates);
    
    // Test if coordinates are valid for mapping
    const pickup = routeData.route.pickup?.coordinates;
    const delivery = routeData.route.delivery?.coordinates;
    
    if (pickup && pickup.latitude && pickup.longitude) {
      console.log('✅ Pickup coordinates are valid for mapping');
    } else {
      console.log('❌ Pickup coordinates missing or invalid');
    }
    
    if (delivery && delivery.latitude && delivery.longitude) {
      console.log('✅ Delivery coordinates are valid for mapping');
    } else {
      console.log('❌ Delivery coordinates missing or invalid');
    }
  } else {
    console.log('❌ Route API failed:', routeData);
  }
})
.catch(error => {
  console.error('💥 Route API test failed:', error);
});
