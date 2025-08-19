const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const exportController = require('../controllers/exportController');

// CORS headers middleware
const addCorsHeaders = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
};

// Middleware to check user role
const checkRole = (role) => (req, res, next) => {
  if (req.user.role === role) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied' });
  }
};

// Farmer exports
router.get('/farmer/deliveries', 
  protect, 
  checkRole('farmer'),
  addCorsHeaders,
  (req, res) => {
    const format = req.query.format || 'csv';
    switch (format.toLowerCase()) {
      case 'csv':
        return exportController.exportFarmerDeliveries(req, res);
      case 'xlsx':
        return exportController.exportFarmerDeliveriesXLSX(req, res);
      case 'pdf':
        return exportController.exportFarmerDeliveriesPDF(req, res);
      default:
        return res.status(400).json({ message: 'Unsupported format' });
    }
  }
);

// Transporter exports
router.get('/transporter/deliveries', 
  protect, 
  checkRole('transporter'),
  addCorsHeaders,
  (req, res) => {
    const format = req.query.format || 'csv';
    switch (format.toLowerCase()) {
      case 'csv':
        return exportController.exportTransporterDeliveries(req, res);
      case 'xlsx':
        return exportController.exportTransporterDeliveriesXLSX(req, res);
      case 'pdf':
        return exportController.exportTransporterDeliveriesPDF(req, res);
      default:
        return res.status(400).json({ message: 'Unsupported format' });
    }
  }
);

// Warehouse exports
router.get('/warehouse/inventory',
  protect,
  checkRole('warehouse_manager'),
  addCorsHeaders,
  (req, res) => {
    const format = req.query.format || 'csv';
    switch (format.toLowerCase()) {
      case 'csv':
        return exportController.exportWarehouseInventory(req, res);
      case 'xlsx':
        return exportController.exportWarehouseInventoryXLSX(req, res);
      case 'pdf':
        return exportController.exportWarehouseInventoryPDF(req, res);
      default:
        return res.status(400).json({ message: 'Unsupported format' });
    }
  }
);

// Market Vendor exports
router.get('/vendor/orders',
  protect,
  checkRole('market_vendor'),
  addCorsHeaders,
  (req, res) => {
    const format = req.query.format || 'csv';
    switch (format.toLowerCase()) {
      case 'csv':
        return exportController.exportVendorOrders(req, res);
      case 'xlsx':
        return exportController.exportVendorOrdersXLSX(req, res);
      case 'pdf':
        return exportController.exportVendorOrdersPDF(req, res);
      default:
        return res.status(400).json({ message: 'Unsupported format' });
    }
  }
);

// Admin exports
router.get('/admin/system-summary',
  protect,
  checkRole('admin'),
  addCorsHeaders,
  (req, res) => {
    const format = req.query.format || 'csv';
    switch (format.toLowerCase()) {
      case 'csv':
        return exportController.exportSystemSummary(req, res);
      case 'xlsx':
        return exportController.exportSystemSummaryXLSX(req, res);
      case 'pdf':
        return exportController.exportSystemSummaryPDF(req, res);
      default:
        return res.status(400).json({ message: 'Unsupported format' });
    }
  }
);

router.get('/admin/all-deliveries',
  protect,
  checkRole('admin'),
  addCorsHeaders,
  (req, res) => {
    const format = req.query.format || 'csv';
    switch (format.toLowerCase()) {
      case 'csv':
        return exportController.exportAllDeliveries(req, res);
      case 'xlsx':
        return exportController.exportAllDeliveriesXLSX(req, res);
      case 'pdf':
        return exportController.exportAllDeliveriesPDF(req, res);
      default:
        return res.status(400).json({ message: 'Unsupported format' });
    }
  }
);

// Additional admin export routes for direct access
router.get('/inventory',
  protect,
  checkRole('admin'),
  addCorsHeaders,
  exportController.exportAllInventory
);

router.get('/inventory/pdf',
  protect,
  checkRole('admin'),
  addCorsHeaders,
  exportController.exportAllInventoryPDF
);

router.get('/deliveries',
  protect,
  checkRole('admin'),
  addCorsHeaders,
  exportController.exportAllDeliveries
);

router.get('/orders',
  protect,
  checkRole('admin'),
  addCorsHeaders,
  exportController.exportAllOrders
);

router.get('/warehouse-summary',
  protect,
  checkRole('admin'),
  addCorsHeaders,
  exportController.exportWarehouseSummary
);


module.exports = router;
