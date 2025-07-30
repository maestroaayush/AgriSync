const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const protect = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const PDFDocument = require('pdfkit');
const Warehouse = require('../models/Warehouse');

// Inventory CSV export with date filtering
router.get('/inventory', protect, async (req, res) => {
  const { from, to } = req.query;
  let filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const data = await Inventory.find(filter).select('itemName quantity unit location addedByRole createdAt');
  const fields = ['itemName', 'quantity', 'unit', 'location', 'addedByRole', 'createdAt'];
  const parser = new Parser({ fields });
  const csv = parser.parse(data);

  res.header('Content-Type', 'text/csv');
  res.attachment('inventory_report.csv');
  return res.send(csv);
});

// Inventory PDF export with optional filtering
router.get('/inventory/pdf', protect, async (req, res) => {
  const { from, to } = req.query;
  let filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const data = await Inventory.find(filter).select('itemName quantity unit location createdAt');
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.pdf');
  doc.pipe(res);

  doc.fontSize(18).text('Inventory Report', { align: 'center' });
  doc.moveDown();

  data.forEach(item => {
    doc.fontSize(12).text(
      `${item.itemName} | ${item.quantity} ${item.unit} | ${item.location} | ${item.createdAt.toDateString()}`
    );
  });

  doc.end();
});

// Delivery CSV export with optional date filtering
router.get('/deliveries', protect, async (req, res) => {
  const { from, to } = req.query;
  let filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const data = await Delivery.find(filter).select('pickupLocation dropoffLocation goodsDescription quantity status createdAt');
  const fields = ['pickupLocation', 'dropoffLocation', 'goodsDescription', 'quantity', 'status', 'createdAt'];
  const parser = new Parser({ fields });
  const csv = parser.parse(data);

  res.header('Content-Type', 'text/csv');
  res.attachment('delivery_report.csv');
  return res.send(csv);
});

// Vendor order CSV export with optional date filtering
router.get('/orders', protect, async (req, res) => {
  const { from, to } = req.query;
  let filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const data = await Order.find(filter).select('itemName quantity unit location status createdAt');
  const fields = ['itemName', 'quantity', 'unit', 'location', 'status', 'createdAt'];
  const parser = new Parser({ fields });
  const csv = parser.parse(data);

  res.header('Content-Type', 'text/csv');
  res.attachment('vendor_orders.csv');
  return res.send(csv);
});

// Warehouse summary CSV export
router.get('/warehouse-summary', protect, async (req, res) => {
  const inventory = await Inventory.aggregate([
    {
      $group: {
        _id: "$location",
        totalQuantity: { $sum: "$quantity" },
        itemCount: { $sum: 1 }
      }
    }
  ]);

  const capacities = await Warehouse.find().select('location capacityLimit');

  const summary = capacities.map(w => {
    const stat = inventory.find(i => i._id === w.location) || { totalQuantity: 0, itemCount: 0 };
    return {
      location: w.location,
      capacityLimit: w.capacityLimit,
      totalQuantity: stat.totalQuantity,
      itemCount: stat.itemCount
    };
  });

  const fields = ['location', 'capacityLimit', 'totalQuantity', 'itemCount'];
  const parser = new Parser({ fields });
  const csv = parser.parse(summary);

  res.header('Content-Type', 'text/csv');
  res.attachment('warehouse_summary.csv');
  return res.send(csv);
});

module.exports = router;
