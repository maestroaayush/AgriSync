const PDFDocument = require('pdfkit');
const json2csv = require('json2csv');
const XLSX = require('xlsx');
const Inventory = require('../models/Inventory');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/user');
const Warehouse = require('../models/Warehouse');

// Generic export format handlers
const exportFormats = {
  // CSV export using json2csv
  csv: (data, fields) => {
    const parser = new json2csv.Parser({ fields });
    return parser.parse(data);
  },
  
  // Excel export using XLSX
  xlsx: (data, fields) => {
    const ws = XLSX.utils.json_to_sheet(data, { header: fields });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  },
  
  // PDF export using PDFKit
  pdf: (data, fields, title = 'Export Report') => {
    const doc = new PDFDocument();
    
    // Add title
    doc.fontSize(18).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    
    // Add table headers
    const tableTop = 150;
    const rowHeight = 25;
    let y = tableTop;
    
    // Calculate column widths
    const pageWidth = doc.page.width - 100; // margins
    const columnWidth = pageWidth / fields.length;
    
    // Draw headers
    doc.font('Helvetica-Bold');
    fields.forEach((field, i) => {
      doc.text(
        field.charAt(0).toUpperCase() + field.slice(1),
        50 + (i * columnWidth),
        y,
        { width: columnWidth, align: 'left' }
      );
    });
    
    // Draw rows
    y += rowHeight;
    doc.font('Helvetica');
    data.forEach(item => {
      // Check if we need a new page
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 50;
      }
      
      fields.forEach((field, i) => {
        doc.text(
          item[field]?.toString() || '',
          50 + (i * columnWidth),
          y,
          { width: columnWidth, align: 'left' }
        );
      });
      y += rowHeight;
    });
    
    return doc;
  }
};

// Generate CSV string from data
const generateCSV = (data, fields) => {
  try {
    const parser = new json2csv.Parser({ fields });
    return parser.parse(data);
  } catch (err) {
    console.error('Error generating CSV:', err);
    throw new Error('Failed to generate CSV');
  }
};

// Format date range for queries
const getDateRange = (from, to) => {
  const query = {};
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }
  return query;
};

// Export controllers for each role
const exportControllers = {
  // Farmer Exports
  async exportFarmerDeliveries(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      const deliveries = await Delivery.find({
        farmer: req.user.id,
        ...dateRange
      }).populate('transporter', 'name');

      const fields = ['id', 'status', 'goodsDescription', 'quantity', 'unit', 'pickupLocation', 'dropoffLocation', 'transporterName', 'requestedDate', 'completedDate'];
      const data = deliveries.map(d => ({
        id: d._id,
        status: d.status,
        goodsDescription: d.goodsDescription,
        quantity: d.quantity,
        unit: d.unit,
        pickupLocation: d.pickupLocation,
        dropoffLocation: d.dropoffLocation,
        transporterName: d.transporter?.name || 'Not assigned',
        requestedDate: d.requestedDate?.toLocaleDateString() || 'N/A',
        completedDate: d.completedDate?.toLocaleDateString() || 'N/A'
      }));

      const csv = generateCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('farmer-deliveries.csv');
      return res.send(csv);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export deliveries' });
    }
  },

  // Transporter Exports
  async exportTransporterDeliveries(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      const deliveries = await Delivery.find({
        transporter: req.user.id,
        ...dateRange
      }).populate('farmer', 'name');

      const fields = ['id', 'status', 'farmerName', 'goodsDescription', 'quantity', 'unit', 'pickupLocation', 'dropoffLocation', 'requestedDate', 'completedDate'];
      const data = deliveries.map(d => ({
        id: d._id,
        status: d.status,
        farmerName: d.farmer?.name || 'Unknown',
        goodsDescription: d.goodsDescription,
        quantity: d.quantity,
        unit: d.unit,
        pickupLocation: d.pickupLocation,
        dropoffLocation: d.dropoffLocation,
        requestedDate: d.requestedDate?.toLocaleDateString() || 'N/A',
        completedDate: d.completedDate?.toLocaleDateString() || 'N/A'
      }));

      const csv = generateCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('transporter-deliveries.csv');
      return res.send(csv);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export deliveries' });
    }
  },

  // Warehouse Exports
  async exportWarehouseInventory(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      const inventory = await Inventory.find({
        user: req.user.id,
        addedByRole: 'warehouse_manager',
        ...dateRange
      });

      const fields = ['id', 'itemName', 'quantity', 'unit', 'location', 'status', 'lastUpdated'];
      const data = inventory.map(item => ({
        id: item._id,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        status: item.status,
        lastUpdated: item.updatedAt.toLocaleDateString()
      }));

      const csv = generateCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('warehouse-inventory.csv');
      return res.send(csv);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export inventory' });
    }
  },

  async exportWarehouseInventoryPDF(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      const inventory = await Inventory.find({
        user: req.user.id,
        addedByRole: 'warehouse_manager',
        ...dateRange
      });

      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=warehouse-inventory.pdf');

      doc.pipe(res);
      doc.fontSize(18).text('AgriSync Warehouse Inventory Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Add table headers
      const tableTop = 150;
      doc.font('Helvetica-Bold');
      doc.text('Item Name', 50, tableTop);
      doc.text('Quantity', 200, tableTop);
      doc.text('Location', 300, tableTop);
      doc.text('Status', 400, tableTop);

      // Add table rows
      let y = tableTop + 25;
      doc.font('Helvetica');
      inventory.forEach(item => {
        doc.text(item.itemName, 50, y);
        doc.text(`${item.quantity} ${item.unit}`, 200, y);
        doc.text(item.location, 300, y);
        doc.text(item.status, 400, y);
        y += 20;
      });

      doc.end();
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export inventory PDF' });
    }
  },

  // Market Vendor Exports
  async exportVendorOrders(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      const orders = await Order.find({
        vendor: req.user.id,
        ...dateRange
      }).populate('warehouse', 'name');

      const fields = ['id', 'productName', 'quantity', 'unit', 'warehouseName', 'status', 'orderDate', 'deliveryDate'];
      const data = orders.map(order => ({
        id: order._id,
        productName: order.productName,
        quantity: order.quantity,
        unit: order.unit,
        warehouseName: order.warehouse?.name || 'Unknown',
        status: order.status,
        orderDate: order.createdAt.toLocaleDateString(),
        deliveryDate: order.deliveryDate?.toLocaleDateString() || 'N/A'
      }));

      const csv = generateCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('vendor-orders.csv');
      return res.send(csv);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export orders' });
    }
  },

  // Admin Exports
  async exportSystemSummary(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      
      // Gather data from all collections
      const [users, deliveries, orders, inventory] = await Promise.all([
        User.countDocuments(),
        Delivery.countDocuments(dateRange),
        Order.countDocuments(dateRange),
        Inventory.countDocuments(dateRange)
      ]);

      const usersByRole = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      const data = [{
        totalUsers: users,
        totalDeliveries: deliveries,
        totalOrders: orders,
        totalInventoryItems: inventory,
        ...Object.fromEntries(usersByRole.map(r => [`${r._id}Count`, r.count]))
      }];

      const fields = ['totalUsers', 'totalDeliveries', 'totalOrders', 'totalInventoryItems', 
        'farmerCount', 'transporterCount', 'warehouse_managerCount', 'market_vendorCount', 'adminCount'];

      const csv = generateCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('system-summary.csv');
      return res.send(csv);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export system summary' });
    }
  },

  async exportAllDeliveries(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      const deliveries = await Delivery.find(dateRange)
        .populate('farmer', 'name')
        .populate('transporter', 'name');

      const fields = ['id', 'status', 'farmerName', 'transporterName', 'goodsDescription', 
        'quantity', 'unit', 'pickupLocation', 'dropoffLocation', 'requestedDate', 'completedDate'];
      
      const data = deliveries.map(d => ({
        id: d._id,
        status: d.status,
        farmerName: d.farmer?.name || 'Unknown',
        transporterName: d.transporter?.name || 'Not assigned',
        goodsDescription: d.goodsDescription,
        quantity: d.quantity,
        unit: d.unit,
        pickupLocation: d.pickupLocation,
        dropoffLocation: d.dropoffLocation,
        requestedDate: d.requestedDate?.toLocaleDateString() || 'N/A',
        completedDate: d.completedDate?.toLocaleDateString() || 'N/A'
      }));

      const csv = generateCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('all-deliveries.csv');
      return res.send(csv);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export deliveries' });
    }
  },

  // Export all inventory (admin)
  async exportAllInventory(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      const inventory = await Inventory.find(dateRange)
        .populate('user', 'name');

      const fields = ['id', 'itemName', 'category', 'quantity', 'unit', 'price', 'location', 'status', 'userName', 'addedByRole', 'lastUpdated'];
      const data = inventory.map(item => ({
        id: item._id,
        itemName: item.itemName,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        location: item.location,
        status: item.status,
        userName: item.user?.name || 'Unknown',
        addedByRole: item.addedByRole,
        lastUpdated: item.updatedAt.toLocaleDateString()
      }));

      const csv = generateCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('all-inventory.csv');
      return res.send(csv);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export inventory' });
    }
  },

  // Export all inventory as PDF (admin)
  async exportAllInventoryPDF(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      const inventory = await Inventory.find(dateRange)
        .populate('user', 'name');

      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=all-inventory.pdf');

      doc.pipe(res);
      doc.fontSize(18).text('AgriSync All Inventory Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Add table headers
      const tableTop = 150;
      doc.font('Helvetica-Bold');
      doc.text('Item Name', 50, tableTop);
      doc.text('Quantity', 150, tableTop);
      doc.text('Location', 250, tableTop);
      doc.text('User', 350, tableTop);
      doc.text('Status', 450, tableTop);

      // Add table rows
      let y = tableTop + 25;
      doc.font('Helvetica');
      inventory.forEach(item => {
        if (y > doc.page.height - 50) {
          doc.addPage();
          y = 50;
        }
        doc.text(item.itemName || 'N/A', 50, y);
        doc.text(`${item.quantity || 0} ${item.unit || ''}`, 150, y);
        doc.text(item.location || 'N/A', 250, y);
        doc.text(item.user?.name || 'Unknown', 350, y);
        doc.text(item.status || 'N/A', 450, y);
        y += 20;
      });

      doc.end();
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export inventory PDF' });
    }
  },

  // Export all orders (admin)
  async exportAllOrders(req, res) {
    try {
      const dateRange = getDateRange(req.query.from, req.query.to);
      const orders = await Order.find(dateRange)
        .populate('vendor', 'name')
        .populate('warehouse', 'name');

      const fields = ['id', 'productName', 'quantity', 'unit', 'vendorName', 'warehouseName', 'status', 'orderDate', 'deliveryDate'];
      const data = orders.map(order => ({
        id: order._id,
        productName: order.productName,
        quantity: order.quantity,
        unit: order.unit,
        vendorName: order.vendor?.name || 'Unknown',
        warehouseName: order.warehouse?.name || 'Unknown',
        status: order.status,
        orderDate: order.createdAt.toLocaleDateString(),
        deliveryDate: order.deliveryDate?.toLocaleDateString() || 'N/A'
      }));

      const csv = generateCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('all-orders.csv');
      return res.send(csv);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export orders' });
    }
  },

  // Export warehouse summary (admin)
  async exportWarehouseSummary(req, res) {
    try {
      const warehouses = await Warehouse.find({}).populate('manager', 'name');
      
      const fields = ['id', 'name', 'location', 'managerName', 'capacity', 'status', 'createdDate'];
      const data = warehouses.map(warehouse => ({
        id: warehouse._id,
        name: warehouse.name,
        location: warehouse.location,
        managerName: warehouse.manager?.name || 'No manager assigned',
        capacity: warehouse.capacity || 'N/A',
        status: warehouse.status || 'Active',
        createdDate: warehouse.createdAt?.toLocaleDateString() || 'N/A'
      }));

      const csv = generateCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('warehouse-summary.csv');
      return res.send(csv);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ message: 'Failed to export warehouse summary' });
    }
  },

};

module.exports = exportControllers;
