const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Inventory = require('../models/Inventory');
const protect = require('../middleware/authMiddleware');

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
