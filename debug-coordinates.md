# Debug Guide: Location and Route Issues

## Current Status
✅ Test map is visible in the Routes tab  
❌ Test map doesn't show current location  
❌ Route to warehouse is not displayed  

## Issues to Check

### 1. Test Map Location Issue
**Problem**: Test map shows default location instead of current location

**Debugging Steps**:
1. Open browser console (F12)
2. Go to Routes tab in transporter dashboard
3. Look for these console messages:
   ```
   🔍 TestMap: Starting location detection...
   📍 TestMap: Requesting geolocation...
   ✅ TestMap: Geolocation successful!
   ```

**Possible Issues**:
- Location access denied by browser
- Geolocation API not supported
- Network/connection issues

**Solutions**:
1. Click the location icon in browser address bar and enable location access
2. Make sure you're using HTTPS (for production) or localhost (for development)
3. Check browser console for specific error messages

### 2. Route to Warehouse Issue
**Problem**: Route coordinates not available for display

**Debugging Steps**:
1. Click "View Route" on any delivery
2. Check browser console for:
   ```
   🚛 Fetching route for delivery ID: [ID]
   📡 Route API Response: [response]
   🗺 Full route structure: [structure]
   ```

**Expected Route Structure**:
```json
{
  "pickup": {
    "coordinates": {
      "latitude": 28.6139,
      "longitude": 77.2090
    }
  },
  "delivery": {
    "coordinates": {
      "latitude": 28.5355,
      "longitude": 77.3910
    }
  }
}
```

**Common Issues**:
1. **Missing coordinates**: Admin hasn't set pickup/dropoff coordinates
2. **Wrong data structure**: API returns different format
3. **Null coordinates**: Coordinates are null or undefined

## Testing Instructions

### Test 1: Check Geolocation
1. Open developer console
2. Run this code:
```javascript
navigator.geolocation.getCurrentPosition(
  (position) => console.log('✅ Location:', position.coords.latitude, position.coords.longitude),
  (error) => console.error('❌ Location error:', error)
);
```

### Test 2: Check Route API
1. Log in as transporter
2. Go to browser console
3. Run this (replace DELIVERY_ID with actual ID):
```javascript
fetch('/api/delivery/DELIVERY_ID/route', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(data => console.log('Route data:', data));
```

## Quick Fixes

### Fix 1: Enable Browser Location
1. Click the location icon in address bar
2. Select "Always allow"
3. Refresh page

### Fix 2: Check Admin Dashboard
1. Log in as admin
2. Go to delivery management
3. Ensure pickup and dropoff coordinates are set for test deliveries

### Fix 3: Manual Test Coordinates
If admin coordinates are missing, you can test with manual coordinates by updating the route API response in the browser console.

## Expected Results

### Working Test Map:
- Shows "Your Current Location" 
- Displays actual latitude/longitude
- Centers on your real location

### Working Route Map:
- Shows pickup location (green marker with 🌾)
- Shows dropoff location (blue marker with 🏭)
- Shows blue dashed line connecting them
- Map centers between the two points

## Next Steps

1. **Test Map**: Check browser console for geolocation errors
2. **Route Map**: Test with a delivery that has coordinates set by admin
3. **Report Results**: Share console logs for further debugging

## Troubleshooting Commands

Check if coordinates exist in database:
```bash
# From server directory
node -e "
const mongoose = require('mongoose');
const Delivery = require('./models/Delivery');
mongoose.connect('mongodb://localhost:27017/agrisync');
Delivery.findOne({}).then(d => {
  console.log('Sample delivery coordinates:');
  console.log('Pickup:', d?.pickupCoordinates);
  console.log('Dropoff:', d?.dropoffCoordinates);
  process.exit();
});
"
```
