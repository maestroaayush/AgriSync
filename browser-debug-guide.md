# 🔍 Browser Debugging Guide for Farmer Dashboard

The backend API is fully functional, but if the browser interface isn't working, follow these steps:

## ✅ Backend Status (CONFIRMED WORKING)
- ✅ Server running on port 5000
- ✅ React app running on port 5173  
- ✅ Database connected with sample data
- ✅ API endpoints tested and working:
  - Login: ✅ Working
  - GET inventory: ✅ Working  
  - POST inventory: ✅ Working
  - POST deliveries: ✅ Working
  - GET deliveries: ✅ Working

## 🌐 Test Login Credentials
```
Email: test.farmer@example.com
Password: password123
```

## 🔧 Browser Debugging Steps

### Step 1: Open Browser Console
1. Open **Chrome/Firefox** and go to `http://localhost:5173`
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. Look for any red error messages

### Step 2: Check Network Tab
1. In Developer Tools, click **Network** tab
2. Try to login with the test credentials above
3. Try adding an inventory item
4. Look for failed HTTP requests (status 400, 500, etc.)

### Step 3: Common Issues to Check

#### Issue 1: Authentication Problems
- **Symptom**: Can't login or get "unauthorized" errors
- **Solution**: Use the test credentials above

#### Issue 2: CORS Errors  
- **Symptom**: Console shows "CORS policy" errors
- **Check**: Network tab shows OPTIONS requests failing
- **Status**: Should be fixed (CORS configured for localhost:5173)

#### Issue 3: API Base URL Issues
- **Symptom**: Network requests go to wrong URL
- **Check**: Requests should go to `http://localhost:5000/api/...`
- **Common mistake**: Requests going to production URLs

#### Issue 4: Form Validation
- **Symptom**: Forms don't submit or show validation errors
- **Check**: Required fields are filled
- **Test Data**:
  ```
  Item Name: Test Corn
  Category: grains  
  Quantity: 25
  Unit: kg
  Location: Mumbai Central Warehouse
  ```

#### Issue 5: JavaScript Errors
- **Symptom**: White screen or broken UI
- **Check**: Console for JavaScript runtime errors
- **Common**: Import/export errors, undefined variables

### Step 4: Test Specific Features

#### Testing Inventory Addition:
1. Login with test credentials
2. Click "Add Item" button
3. Fill form with test data above
4. Submit form
5. **Expected**: Item appears in inventory list

#### Testing Delivery Request:
1. Click "Request Delivery" button  
2. Fill form:
   ```
   Destination: Delhi Storage Facility
   Item Name: Test Corn
   Quantity: 10
   Priority: Normal
   ```
3. Submit form
4. **Expected**: Delivery appears in deliveries list

### Step 5: Export Testing
1. Add some inventory items first
2. Click "Export Inventory" button
3. **Expected**: CSV file downloads automatically

## 🛠️ If Issues Persist

### Check React Component State
Add this to browser console to debug:
```javascript
// Check if user is logged in
console.log('User:', JSON.parse(localStorage.getItem('user')));
console.log('Token:', localStorage.getItem('token'));
```

### Manual API Test
Test API directly from browser console:
```javascript
// Test inventory fetch
fetch('http://localhost:5000/api/inventory', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())  
.then(console.log);
```

### Clear Browser Cache
1. Hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
2. Clear localStorage: In console, run `localStorage.clear()`
3. Clear cookies for localhost

## 📞 Report Findings
When reporting issues, please include:
1. **Browser console errors** (copy exact error messages)
2. **Network tab failures** (which requests fail and why)
3. **What you clicked** (exact steps to reproduce)
4. **Expected vs actual behavior**

## 🎯 Most Likely Issues
Based on the backend working perfectly:
1. **Form validation** - Required fields not filled properly
2. **Authentication expired** - Need to login again  
3. **JavaScript errors** - Check console for red errors
4. **Network connectivity** - Firewall blocking localhost:5000

The backend is 100% functional, so any issues are client-side! 🚀
