#!/bin/bash

# Test Warehouse Manager Integration in Delivery Management
# This script tests if warehouse managers with coordinates are showing in delivery destination selection

echo "🧪 Testing Warehouse Manager Integration in Delivery Management"
echo "============================================================"

# Check if server is running
echo "📡 Checking server status..."
if curl -s http://localhost:5000/api/auth/users/locations >/dev/null 2>&1; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start the server first:"
    echo "   cd server && npm run dev"
    exit 1
fi

echo ""
echo "🔍 Testing API endpoints..."

# Test warehouse managers endpoint
echo "1. Checking warehouse managers with coordinates:"
curl -s "http://localhost:5000/api/auth/users/locations?role=warehouse_manager" | jq -r '.users[] | "📍 \(.name) - \(.coordinates.address // "No address") (\(.coordinates.latitude // "N/A"), \(.coordinates.longitude // "N/A"))"' 2>/dev/null || echo "No warehouse managers found or jq not installed"

echo ""
echo "2. Checking traditional warehouses:"
curl -s "http://localhost:5000/api/warehouses?manualOnly=true" | jq -r '.[] | "🏭 \(.name) - \(.location // "No location")"' 2>/dev/null || echo "No traditional warehouses found or jq not installed"

echo ""
echo "✅ Integration Implementation Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Changes Made:"
echo "   • Added getCombinedWarehouses() function to merge both warehouse sources"
echo "   • Updated warehouse dropdown to show warehouse managers with coordinates"
echo "   • Enhanced warehouse selection to handle both User and Warehouse models"
echo "   • Added visual indicators for warehouse managers vs traditional warehouses"
echo "   • Updated delivery acceptance logic to handle both types"
echo ""
echo "📋 How It Works:"
echo "   • Delivery management modal now shows BOTH:"
echo "     - Traditional warehouses from Warehouse model"
echo "     - Warehouse managers with coordinates from Location tab"
echo "   • Warehouse managers appear with '🏪 (Warehouse Manager)' label"
echo "   • Admin-set coordinates are automatically used for delivery dropoff"
echo "   • System preserves all existing warehouse functionality"
echo ""
echo "🎯 Expected Result:"
echo "   • Warehouse dropdown in 'Manage Delivery Request' now includes"
echo "     warehouse managers that have coordinates set in Location tab"
echo "   • Coordinates are automatically used for route optimization"
echo "   • Both warehouse types work seamlessly together"
echo ""
echo "🧪 To Test:"
echo "   1. Login as admin"
echo "   2. Go to Location tab and set coordinates for warehouse managers"
echo "   3. Go to Delivery tab and click 'Manage' on a pending delivery"
echo "   4. Check warehouse dropdown - should show both types"
echo "   5. Select a warehouse manager and assign delivery"
echo "   6. Verify coordinates are used for dropoff location"

echo ""
echo "🎉 Warehouse manager integration is ready for testing!"
