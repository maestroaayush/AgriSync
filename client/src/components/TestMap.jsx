import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Create a custom transporter icon
const transporterIcon = L.divIcon({
  html: `<div style="background-color: #3B82F6; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 16px;">🚛</div>`,
  className: 'custom-transporter-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const TestMap = ({ userLocation, defaultPosition }) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [debugInfo, setDebugInfo] = useState({});

  // Default fallback position
  const fallbackPosition = defaultPosition || [28.6139, 77.2090]; // New Delhi coordinates

  // Check geolocation permission status
  const checkPermissionStatus = async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        console.log('� TestMap: Permission status:', permission.state);
        setPermissionStatus(permission.state);
        
        // Listen for permission changes
        permission.onchange = () => {
          console.log('🔄 TestMap: Permission changed to:', permission.state);
          setPermissionStatus(permission.state);
        };
        
        return permission.state;
      } catch (error) {
        console.log('⚠️ TestMap: Could not check permission status:', error);
        setPermissionStatus('unknown');
        return 'unknown';
      }
    }
    return 'unknown';
  };

  // Enhanced location request with debugging
  const getCurrentLocation = async (retryCount = 0) => {
    console.log(`🔍 TestMap: Starting location detection (attempt ${retryCount + 1})...`);
    
    // Update debug info
    const debug = {
      userAgent: navigator.userAgent,
      geolocationSupported: !!navigator.geolocation,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      timestamp: new Date().toISOString()
    };
    setDebugInfo(debug);
    console.log('🔍 TestMap: Debug info:', debug);
    
    // Check permission first
    const permission = await checkPermissionStatus();
    
    if (permission === 'denied') {
      console.log('❌ TestMap: Permission denied');
      setLocationError('Location access denied. Click the location icon in your browser address bar and allow location access.');
      setCurrentPosition(fallbackPosition);
      setLoading(false);
      return;
    }
    
    if (!navigator.geolocation) {
      console.error('❌ TestMap: Geolocation not supported');
      setLocationError('Geolocation is not supported by this browser');
      setCurrentPosition(fallbackPosition);
      setLoading(false);
      return;
    }
    
    console.log('📍 TestMap: Requesting geolocation...');
    
    // Enhanced geolocation request with multiple fallback strategies
    const options = {
      enableHighAccuracy: retryCount === 0, // First try high accuracy
      timeout: retryCount === 0 ? 10000 : 15000, // Longer timeout on retry
      maximumAge: retryCount === 0 ? 60000 : 0 // Allow cache on first try, force fresh on retry
    };
    
    console.log('📍 TestMap: Using options:', options);
    
    const timeoutId = setTimeout(() => {
      console.log('⏰ TestMap: Manual timeout triggered');
      setLocationError(`Location request took too long (attempt ${retryCount + 1}). Using default location.`);
      setCurrentPosition(fallbackPosition);
      setLoading(false);
    }, options.timeout + 2000); // Manual timeout slightly longer than geolocation timeout
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude, accuracy, timestamp } = position.coords;
        console.log('✅ TestMap: Geolocation successful!');
        console.log('📍 TestMap: Coordinates:', latitude, longitude);
        console.log('📍 TestMap: Accuracy:', accuracy, 'meters');
        console.log('📍 TestMap: Timestamp:', new Date(timestamp).toISOString());
        
        setCurrentPosition([latitude, longitude]);
        const statusMessage = accuracy > 1000 
          ? `Location found (low accuracy: ~${Math.round(accuracy/1000)}km)` 
          : accuracy > 100 
          ? `Location found (medium accuracy: ~${Math.round(accuracy)}m)`
          : 'Location found (high accuracy)';
        setLocationError(statusMessage);
        setLoading(false);
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('❌ TestMap: Geolocation failed:', error);
        console.error('❌ TestMap: Error code:', error.code);
        console.error('❌ TestMap: Error message:', error.message);
        
        let errorMessage = 'Location access failed';
        let shouldRetry = false;
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please click the 🔒 icon in your browser address bar and allow location access, then refresh the page.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Make sure GPS is enabled and you have internet connection.';
            shouldRetry = retryCount < 1;
            break;
          case error.TIMEOUT:
            errorMessage = `Location request timed out (attempt ${retryCount + 1}). Try moving near a window or outside for better GPS signal.`;
            shouldRetry = retryCount < 2;
            break;
          default:
            errorMessage = `Location error: ${error.message}. Using default location.`;
            shouldRetry = retryCount < 1;
            break;
        }
        
        if (shouldRetry) {
          console.log(`🔄 TestMap: Retrying location request in 2 seconds (attempt ${retryCount + 2})...`);
          setTimeout(() => getCurrentLocation(retryCount + 1), 2000);
        } else {
          setLocationError(errorMessage);
          setCurrentPosition(fallbackPosition);
          setLoading(false);
        }
        
        console.log('🔄 TestMap: Using fallback position:', fallbackPosition);
      },
      options
    );
  };

  useEffect(() => {
    console.log('🔍 TestMap: Component mounted, starting location detection...');
    console.log('🔍 TestMap: User location prop:', userLocation);
    
    // Check if userLocation prop is provided first
    if (userLocation && Array.isArray(userLocation) && userLocation.length === 2) {
      console.log('✅ TestMap: Using provided user location:', userLocation);
      setCurrentPosition(userLocation);
      setLocationError('Using provided location coordinates');
      setLoading(false);
      return;
    }
    
    // Start enhanced location detection
    getCurrentLocation();
  }, [userLocation]);

  const displayPosition = currentPosition || fallbackPosition;
  
  console.log('TestMap rendering with position:', displayPosition);
  console.log('TestMap loading state:', loading);
  console.log('TestMap error:', locationError);

  return (
    <div style={{ width: '100%', height: '400px', border: '2px solid #3B82F6', borderRadius: '8px' }}>
      <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <h4 style={{ margin: 0, color: '#1E40AF' }}>🧪 Transporter Location Test Map</h4>
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
          {loading ? (
            '📍 Getting your current location...'
          ) : locationError ? (
            <span style={{ color: locationError.includes('found') ? '#059669' : '#DC2626' }}>
              {locationError.includes('found') ? '✅' : '⚠️'} {locationError}
            </span>
          ) : (
            `📍 Current location: ${displayPosition[0].toFixed(4)}, ${displayPosition[1].toFixed(4)}`
          )}
          {permissionStatus && permissionStatus !== 'unknown' && (
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              Permission: <span style={{ 
                color: permissionStatus === 'granted' ? '#059669' : 
                      permissionStatus === 'denied' ? '#DC2626' : '#F59E0B',
                fontWeight: 'bold'
              }}>
                {permissionStatus.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Enhanced status indicator and debugging */}
        {(locationError || !loading) && (
          <div style={{ marginTop: '8px' }}>
            {/* Retry button */}
            {locationError && !loading && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <button
                  onClick={() => {
                    console.log('🔄 TestMap: Manual retry triggered...');
                    setLoading(true);
                    setLocationError(null);
                    setCurrentPosition(null);
                    getCurrentLocation(0);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🔄 Retry Location
                </button>
                
                {permissionStatus === 'denied' && (
                  <button
                    onClick={() => {
                      alert('To enable location access:\n\n1. Look for the 🔒 or 📍 icon in your browser address bar\n2. Click it and select "Allow" for location\n3. Refresh this page\n\nOr go to browser Settings → Privacy → Location and allow this site.');
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      backgroundColor: '#F59E0B',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🔒 Fix Permissions
                  </button>
                )}
                
                <span style={{ fontSize: '10px', color: '#64748B' }}>
                  or use test buttons below
                </span>
              </div>
            )}
            
            {/* Debug information toggle */}
            <details style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>🔧 Debug Information</summary>
              <div style={{ marginTop: '4px', padding: '4px', backgroundColor: '#F8FAFC', borderRadius: '4px', fontFamily: 'monospace' }}>
                <div>Browser: {debugInfo.userAgent?.substring(0, 50)}...</div>
                <div>Geolocation Support: {debugInfo.geolocationSupported ? '✅' : '❌'}</div>
                <div>Secure Context: {debugInfo.isSecureContext ? '✅' : '❌'}</div>
                <div>Protocol: {debugInfo.protocol}</div>
                <div>Permission Status: {permissionStatus}</div>
                <div>Current Position: {currentPosition ? `${currentPosition[0].toFixed(6)}, ${currentPosition[1].toFixed(6)}` : 'none'}</div>
                <div>Timestamp: {debugInfo.timestamp}</div>
              </div>
            </details>
          </div>
        )}
        
        {/* Quick test buttons */}
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              console.log('🧪 TestMap: Manual test - Kathmandu location');
              setCurrentPosition([27.7172, 85.3240]); // Kathmandu coordinates
              setLocationError('Manually set to Kathmandu, Nepal');
              setLoading(false);
            }}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🇳🇵 Test Kathmandu
          </button>
          
          <button
            onClick={() => {
              // Test browser geolocation directly
              console.log('🧪 TestMap: Testing browser geolocation directly...');
              setLoading(true);
              
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  console.log('✅ Direct geolocation success:', position.coords);
                  setCurrentPosition([position.coords.latitude, position.coords.longitude]);
                  setLocationError(null);
                  setLoading(false);
                },
                (error) => {
                  console.error('❌ Direct geolocation failed:', error);
                  setLocationError(`Direct test failed: ${error.message}`);
                  setCurrentPosition([27.7172, 85.3240]); // Fallback to Kathmandu
                  setLoading(false);
                },
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
              );
            }}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📍 Test Direct Location
          </button>
          
          <button
            onClick={() => {
              // Manual coordinate entry
              const lat = prompt('Enter your latitude (e.g., 27.7172):');
              const lng = prompt('Enter your longitude (e.g., 85.3240):');
              
              if (lat && lng) {
                const latitude = parseFloat(lat);
                const longitude = parseFloat(lng);
                
                if (!isNaN(latitude) && !isNaN(longitude)) {
                  console.log('🧪 TestMap: Manual coordinates set:', latitude, longitude);
                  setCurrentPosition([latitude, longitude]);
                  setLocationError(`Manually set coordinates: ${latitude}, ${longitude}`);
                  setLoading(false);
                } else {
                  alert('Invalid coordinates. Please enter valid numbers.');
                }
              }
            }}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              backgroundColor: '#F59E0B',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✏️ Manual Coords
          </button>
        </div>
      </div>
      <div style={{ height: '350px' }}>
        {displayPosition && (
          <MapContainer
            center={displayPosition}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            key={displayPosition.join(',')} // Force remount when position changes
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={displayPosition} icon={transporterIcon}>
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>🚛</div>
                  <div style={{ fontWeight: 'bold', color: '#1E40AF' }}>
                    {locationError ? 'Default Location' : 'Your Current Location'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Lat: {displayPosition[0].toFixed(6)}<br/>
                    Lng: {displayPosition[1].toFixed(6)}
                  </div>
                  {locationError && (
                    <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>
                      Enable location access for accurate positioning
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default TestMap;
