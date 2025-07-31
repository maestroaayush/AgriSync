const mongoose = require('mongoose');

const SmartContractSchema = new mongoose.Schema({
  contractId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  contractType: {
    type: String,
    enum: ['purchase_agreement', 'delivery_contract', 'quality_assurance', 'storage_agreement'],
    required: true
  },
  
  // Parties involved
  parties: {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    intermediaries: [{
      role: String, // 'transporter', 'warehouse', 'inspector'
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      commission: Number
    }]
  },

  // Contract Terms
  contractTerms: {
    productDetails: {
      itemName: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, required: true },
      qualityGrade: String,
      specifications: String
    },
    
    priceTerms: {
      totalAmount: { type: Number, required: true },
      pricePerUnit: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
      paymentMethod: {
        type: String,
        enum: ['escrow', 'direct_transfer', 'bank_transfer', 'digital_wallet'],
        default: 'escrow'
      }
    },

    deliveryTerms: {
      pickupLocation: String,
      deliveryLocation: String,
      pickupDate: Date,
      expectedDeliveryDate: Date,
      deliveryMethod: String,
      packagingRequirements: String
    },

    qualityConditions: {
      minimumGrade: String,
      moistureContent: Number,
      temperatureRange: {
        min: Number,
        max: Number
      },
      inspectionRequired: { type: Boolean, default: true },
      qualityPenalties: [{
        condition: String,
        penaltyPercentage: Number
      }]
    }
  },

  // Contract Execution
  executionStatus: {
    type: String,
    enum: ['draft', 'active', 'in_progress', 'completed', 'breached', 'cancelled'],
    default: 'draft'
  },

  // Milestones and Conditions
  milestones: [{
    milestone: String,
    condition: String,
    completedDate: Date,
    isCompleted: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    automatedTrigger: { type: Boolean, default: false }
  }],

  // Payment Information
  paymentDetails: {
    escrowAmount: Number,
    releasedAmount: Number,
    pendingAmount: Number,
    paymentSchedule: [{
      milestone: String,
      percentage: Number,
      amount: Number,
      dueDate: Date,
      paid: { type: Boolean, default: false },
      paidDate: Date
    }],
    penalties: [{
      reason: String,
      amount: Number,
      appliedDate: Date
    }],
    bonuses: [{
      reason: String,
      amount: Number,
      appliedDate: Date
    }]
  },

  // Smart Contract Conditions (automated)
  automatedConditions: [{
    conditionType: {
      type: String,
      enum: ['quality_check', 'delivery_confirmation', 'temperature_monitoring', 'time_deadline']
    },
    parameters: mongoose.Schema.Types.Mixed, // Flexible for different condition types
    triggerAction: String,
    isActive: { type: Boolean, default: true },
    lastChecked: Date
  }],

  // Contract Events Log
  eventLog: [{
    event: String,
    description: String,
    timestamp: Date,
    triggeredBy: {
      type: String,
      enum: ['user', 'system', 'external_api']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    metadata: mongoose.Schema.Types.Mixed
  }],

  // Dispute Resolution
  disputes: [{
    disputeType: String,
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String,
    evidence: [String], // URLs to evidence documents/images
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'escalated'],
      default: 'open'
    },
    resolution: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedDate: Date
  }],

  // Contract Metadata
  contractHash: String, // For blockchain integration
  digitalSignatures: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signatureHash: String,
    signedDate: Date,
    ipAddress: String
  }],
  
  expiryDate: Date,
  templateUsed: String,
  legalJurisdiction: String,
  
  // Performance Metrics
  performanceMetrics: {
    onTimeDelivery: Boolean,
    qualityCompliance: Boolean,
    paymentCompliance: Boolean,
    overallRating: Number,
    feedback: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
SmartContractSchema.index({ contractId: 1 });
SmartContractSchema.index({ 'parties.buyer': 1 });
SmartContractSchema.index({ 'parties.seller': 1 });
SmartContractSchema.index({ executionStatus: 1 });
SmartContractSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SmartContract', SmartContractSchema);
