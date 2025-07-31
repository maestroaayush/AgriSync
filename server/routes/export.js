const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Inventory = require('../models/Inventory');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const protect = require('../middleware/authMiddleware');

// CSV helper function
const formatCSV = (data) => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  return [headers, ...rows].join('\n');
};

// Inventory CSV export
router.get('/inventory', protect, async (req, res) => {
  try {
    const items = await Inventory.find();
    const csvData = items.map(item => ({
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      createdAt: item.createdAt
    }));
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
    res.send(formatCSV(csvData));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory PDF export
router.get('/inventory/pdf', protect, async (req, res) => {
  try {
    const items = await Inventory.find();

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.pdf');

    doc.pipe(res);
    doc.fontSize(18).text('AgriSync Inventory Report', { align: 'center' });
    doc.moveDown();

    items.forEach(item => {
      doc.fontSize(12).text(`${item.itemName} - ${item.quantity} ${item.unit} at ${item.location}`);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deliveries CSV export
router.get('/deliveries', protect, async (req, res) => {
  try {
    const deliveries = await Delivery.find();
    const csvData = deliveries.map(delivery => ({
      goodsDescription: delivery.goodsDescription,
      quantity: delivery.quantity,
      status: delivery.status,
      pickupLocation: delivery.pickupLocation,
      dropoffLocation: delivery.dropoffLocation,
      createdAt: delivery.createdAt
    }));
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=deliveries.csv');
    res.send(formatCSV(csvData));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders CSV export
router.get('/orders', protect, async (req, res) => {
  try {
    const orders = await Order.find().catch(() => []);
    const csvData = orders.map(order => ({
      itemName: order.itemName || 'N/A',
      quantity: order.quantity || 0,
      status: order.status || 'pending',
      createdAt: order.createdAt || new Date()
    }));
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(formatCSV(csvData));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Warehouse summary CSV export
router.get('/warehouse-summary', protect, async (req, res) => {
  try {
    const inventoryCount = await Inventory.countDocuments();
    const deliveryCount = await Delivery.countDocuments();
    const csvData = [{
      totalInventoryItems: inventoryCount,
      totalDeliveries: deliveryCount,
      exportDate: new Date().toISOString()
    }];
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=warehouse-summary.csv');
    res.send(formatCSV(csvData));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy inventory report (keeping for backward compatibility)
router.get('/inventory-report', protect, async (req, res) => {
  const items = await Inventory.find({ user: req.user.id });

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.pdf');

  doc.pipe(res);
  doc.fontSize(18).text('AgriSync Inventory Report', { align: 'center' });
  doc.moveDown();

  items.forEach(item => {
    doc.fontSize(12).text(`${item.itemName} - ${item.quantity} ${item.unit} at ${item.location}`);
  });

  doc.end();
});

module.exports = router;
