const express = require('express');
const { check, validationResult } = require('express-validator');
const Inventory = require('../models/Inventory');
const Sales = require('../models/Sale');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Add new inventory item
router.post(
  '/inventory/add',
  authMiddleware,
  [
    check('itemName', 'Item name is required').not().isEmpty(),
    check('quantity', 'Quantity is required').isNumeric(),
    check('unit', 'Unit is required').not().isEmpty(),
    check('location', 'Location is required').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newItem = new Inventory({
        ...req.body,
        user: req.user.id,
        addedByRole: req.user.role,
      });

      const item = await newItem.save();

      res.json(item);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// Record a sale
router.post(
  '/sales/record',
  authMiddleware,
  [
    check('buyer', 'Buyer is required').not().isEmpty(),
    check('quantity', 'Quantity is required').isNumeric(),
    check('pricePerUnit', 'Price is required').isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const saleData = {
        ...req.body,
        farmer: req.user.id,
        totalAmount: req.body.quantity * req.body.pricePerUnit,
      };

      const sale = new Sales(saleData);
      await sale.save();

      res.json(sale);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
