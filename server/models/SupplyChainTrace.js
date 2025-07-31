const mongoose = require('mongoose');

const SupplyChainTraceSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  batchId: {
    type: String,
    required: true,
    trim: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  productCategory: {
    type: String,
    required: true,
    trim: true
  },
  
  // Farm Stage
  farmStage: {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    farmLocation: {
      type: String,
      required: true
    },
    farmCoordinates: {
      latitude: Number,
      longitude: Number
    },
    plantingDate: Date,
    harvestDate: Date,
    seedVariety: String,
    organicCertified: {
      type: Boolean,
      default: false
    },
    farmingMethods: [String],
    qualityGrade: {
      type: String,
      enum: ['A', 'B', 'C'],
      default: 'B'
    },
    certifications: [String]
  },

  // Processing Stage (if applicable)
  processingStage: {
    processor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processingDate: Date,
    processingType: String,
    qualityTests: [{
      testType: String,
      result: String,
      testDate: Date,
      passedTest: Boolean
    }]
  },

  // Warehouse/Storage Stage
  warehouseStage: {
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    storageDate: Date,
    storageConditions: {
      temperature: Number,
      humidity: Number,
      ventilation: String
    },
    storageType: String,
    qualityInspection: {
      inspectorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      inspectionDate: Date,
      qualityScore: Number,
      notes: String
    }
  },

  // Transportation Stage
  transportationStages: [{
    transporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vehicleId: String,
    pickupLocation: String,
    dropoffLocation: String,
    pickupDate: Date,
    deliveryDate: Date,
    transportConditions: {
      temperature: Number,
      humidity: Number,
      refrigerated: Boolean
    },
    gpsTracking: [{
      timestamp: Date,
      latitude: Number,
      longitude: Number,
      temperature: Number
    }]
  }],

  // Market/Vendor Stage
  marketStage: {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    marketLocation: String,
    receivedDate: Date,
    sellingPrice: Number,
    soldDate: Date,
    finalQualityCheck: {
      freshness: String,
      appearance: String,
      overallGrade: String
    }
  },

  // Consumer Information
  consumerStage: {
    soldTo: String, // customer name or ID
    saleDate: Date,
    salePrice: Number,
    feedback: {
      rating: Number,
      comments: String
    }
  },

  // Overall Product Information
  currentStatus: {
    type: String,
    enum: ['planted', 'harvested', 'processed', 'stored', 'in_transit', 'at_market', 'sold'],
    default: 'planted'
  },
  currentLocation: String,
  currentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  totalQuantity: {
    amount: Number,
    unit: String
  },
  expiryDate: Date,
  
  // Sustainability Metrics
  sustainabilityMetrics: {
    carbonFootprint: Number, // kg CO2
    waterUsage: Number, // liters
    energyConsumption: Number, // kWh
    wasteGenerated: Number, // kg
    sustainabilityScore: Number // 0-100
  },

  // QR Code for consumer scanning
  qrCode: String,
  
  // Blockchain hash (for future integration)
  blockchainHash: String,

  // Alerts and Issues
  alerts: [{
    type: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    timestamp: Date,
    resolved: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Index for efficient searching
SupplyChainTraceSchema.index({ productId: 1 });
SupplyChainTraceSchema.index({ batchId: 1 });
SupplyChainTraceSchema.index({ currentStatus: 1 });
SupplyChainTraceSchema.index({ 'farmStage.farmer': 1 });

module.exports = mongoose.model('SupplyChainTrace', SupplyChainTraceSchema);
