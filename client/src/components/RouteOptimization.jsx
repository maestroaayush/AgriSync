import React from 'react';
import UnifiedRouteMap from './UnifiedRouteMap';

const RouteOptimization = ({ deliveries = [], currentLocation, className = "" }) => {
  const handleRouteCalculated = (optimizedRoute, stats) => {
    console.log('Route optimized:', optimizedRoute, 'Stats:', stats);
  };

  return (
    <UnifiedRouteMap
      deliveries={deliveries}
      currentLocation={currentLocation}
      className={className}
      height="400px"
      showOptimization={true}
      showInteractive={false}
      onRouteCalculated={handleRouteCalculated}
    />
  );
};

export default RouteOptimization;
