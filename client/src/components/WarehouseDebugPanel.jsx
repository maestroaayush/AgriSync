import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Bug, Trash2 } from 'lucide-react';

/**
 * Temporary Debug Panel for Warehouse Dashboard Issues
 * 
 * This component helps diagnose common issues with the warehouse dashboard.
 * Add this component temporarily to the WarehouseDashboard to debug issues.
 * 
 * Usage: Add <WarehouseDebugPanel /> to WarehouseDashboard component
 */
function WarehouseDebugPanel() {
  const [debugInfo, setDebugInfo] = useState({});
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    updateDebugInfo();
  }, []);

  const updateDebugInfo = () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;
    
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('Error parsing user data:', e);
    }

    const info = {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      hasUser: !!user,
      userRole: user?.role || 'unknown',
      userName: user?.name || 'unknown',
      userLocation: user?.location || 'not set',
      serverUrl: 'http://localhost:5000',
      currentPath: window.location.pathname,
      timestamp: new Date().toLocaleTimeString()
    };

    setDebugInfo(info);
  };

  const testAddModal = () => {
    console.log('🧪 Testing Add Modal State...');
    
    // Try to find the Add Item button
    const addButtons = document.querySelectorAll('button');
    const addItemButton = Array.from(addButtons).find(btn => 
      btn.textContent.includes('Add Item') || 
      btn.textContent.includes('Add Inventory')
    );

    const modalElement = document.querySelector('[role="dialog"]');
    
    setTestResults(prev => ({
      ...prev,
      addModal: {
        buttonFound: !!addItemButton,
        modalVisible: !!modalElement,
        buttonText: addItemButton?.textContent || 'Not found',
        timestamp: new Date().toLocaleTimeString()
      }
    }));

    console.log('Add Item Button Found:', !!addItemButton);
    console.log('Modal Visible:', !!modalElement);
    
    if (addItemButton) {
      console.log('Button text:', addItemButton.textContent);
      addItemButton.click();
      
      setTimeout(() => {
        const newModalElement = document.querySelector('[role="dialog"]');
        console.log('Modal opened after click:', !!newModalElement);
        
        setTestResults(prev => ({
          ...prev,
          addModal: {
            ...prev.addModal,
            modalOpenedAfterClick: !!newModalElement
          }
        }));
      }, 100);
    }
  };

  const testApiConnection = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('http://localhost:5000/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        api: {
          status: response.status,
          success: response.ok,
          itemCount: Array.isArray(data) ? data.length : 0,
          error: response.ok ? null : data.message || 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }));

      console.log('API Test Result:', { status: response.status, data });
      
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        api: {
          success: false,
          error: error.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
      console.error('API Test Failed:', error);
    }
  };

  const addTestInventory = async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    const testItems = [
      { itemName: 'Debug Test Rice', quantity: 100, unit: 'kg', location: user?.location || 'Debug Location', category: 'grains' },
      { itemName: 'Debug Test Wheat', quantity: 50, unit: 'bags', location: user?.location || 'Debug Location', category: 'grains' },
      { itemName: 'Debug Test Corn', quantity: 75, unit: 'units', location: user?.location || 'Debug Location', category: 'vegetables' }
    ];
    
    let successCount = 0;
    const errors = [];
    
    for (const item of testItems) {
      try {
        const response = await fetch('http://localhost:5000/api/inventory', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item)
        });
        
        if (response.ok) {
          successCount++;
          console.log('✅ Added test item:', item.itemName);
        } else {
          const errorData = await response.json();
          errors.push(`${item.itemName}: ${errorData.message}`);
        }
      } catch (error) {
        errors.push(`${item.itemName}: ${error.message}`);
      }
    }
    
    setTestResults(prev => ({
      ...prev,
      testData: {
        itemsAdded: successCount,
        totalItems: testItems.length,
        errors: errors,
        timestamp: new Date().toLocaleTimeString()
      }
    }));

    // Trigger a page refresh to see new items
    if (successCount > 0) {
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const clearTestData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // First get all inventory items
      const response = await fetch('http://localhost:5000/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const items = await response.json();
        const testItems = items.filter(item => item.itemName.includes('Debug Test'));
        
        let deletedCount = 0;
        for (const item of testItems) {
          try {
            const deleteResponse = await fetch(`http://localhost:5000/api/inventory/${item._id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (deleteResponse.ok) {
              deletedCount++;
            }
          } catch (error) {
            console.error('Error deleting item:', error);
          }
        }
        
        setTestResults(prev => ({
          ...prev,
          cleanup: {
            itemsDeleted: deletedCount,
            timestamp: new Date().toLocaleTimeString()
          }
        }));

        if (deletedCount > 0) {
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    } catch (error) {
      console.error('Error clearing test data:', error);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
          title="Open Debug Panel"
        >
          <Bug className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border-2 border-purple-300 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-purple-50">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-purple-800 flex items-center">
            <Bug className="h-4 w-4 mr-2" />
            Debug Panel
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-purple-600 hover:text-purple-800 text-xl font-bold"
          >
            ×
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Authentication Status */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Authentication Status</h4>
          <div className="text-sm space-y-1">
            <div className={`flex items-center ${debugInfo.hasToken ? 'text-green-600' : 'text-red-600'}`}>
              {debugInfo.hasToken ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              Token: {debugInfo.hasToken ? `Present (${debugInfo.tokenLength} chars)` : 'Missing'}
            </div>
            <div className={`flex items-center ${debugInfo.hasUser ? 'text-green-600' : 'text-red-600'}`}>
              {debugInfo.hasUser ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              User: {debugInfo.userName} ({debugInfo.userRole})
            </div>
            <div className="text-gray-600">
              Location: {debugInfo.userLocation}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Quick Tests</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={testAddModal}
              className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
            >
              Test Modal
            </button>
            <button
              onClick={testApiConnection}
              className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
            >
              Test API
            </button>
            <button
              onClick={addTestInventory}
              className="bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-600"
            >
              Add Test Data
            </button>
            <button
              onClick={clearTestData}
              className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 flex items-center justify-center"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Tests
            </button>
          </div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Test Results</h4>
            <div className="text-xs space-y-2 bg-gray-50 p-2 rounded">
              {testResults.addModal && (
                <div>
                  <strong>Modal Test:</strong>
                  <div>Button Found: {testResults.addModal.buttonFound ? '✅' : '❌'}</div>
                  <div>Modal Visible: {testResults.addModal.modalVisible ? '✅' : '❌'}</div>
                  {testResults.addModal.modalOpenedAfterClick !== undefined && (
                    <div>Opens on Click: {testResults.addModal.modalOpenedAfterClick ? '✅' : '❌'}</div>
                  )}
                </div>
              )}
              
              {testResults.api && (
                <div>
                  <strong>API Test:</strong>
                  <div>Status: {testResults.api.success ? `✅ ${testResults.api.status}` : `❌ ${testResults.api.status || 'Failed'}`}</div>
                  {testResults.api.itemCount !== undefined && (
                    <div>Items: {testResults.api.itemCount}</div>
                  )}
                  {testResults.api.error && (
                    <div className="text-red-600">Error: {testResults.api.error}</div>
                  )}
                </div>
              )}

              {testResults.testData && (
                <div>
                  <strong>Test Data:</strong>
                  <div>Added: {testResults.testData.itemsAdded}/{testResults.testData.totalItems}</div>
                  {testResults.testData.errors.length > 0 && (
                    <div className="text-red-600">Errors: {testResults.testData.errors.length}</div>
                  )}
                </div>
              )}

              {testResults.cleanup && (
                <div>
                  <strong>Cleanup:</strong>
                  <div>Deleted: {testResults.cleanup.itemsDeleted} items</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={updateDebugInfo}
            className="w-full bg-gray-500 text-white text-xs px-2 py-1 rounded hover:bg-gray-600"
          >
            Refresh Debug Info ({debugInfo.timestamp})
          </button>
        </div>
      </div>
    </div>
  );
}

export default WarehouseDebugPanel;
