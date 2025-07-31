const mongoose = require('mongoose');

const CropForecastSchema = new mongoose.Schema({
  cropType: {
    type: String,
    required: true,
    trim: true
  },
  region: {
    type: String,
    required: true
  },
  season: {
    type: String,
    enum: ['spring', 'summer', 'monsoon', 'winter'],
    required: true
  },
  expectedYield: {
    type: Number,
    required: true // in tons
  },
  expectedDemand: {
    type: Number,
    required: true // in tons
  },
  priceProjection: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    average: { type: Number, required: true }
  },
  weatherData: {
    avgTemperature: Number,
    avgRainfall: Number,
    avgHumidity: Number
  },
  marketTrends: {
    lastYearPrice: Number,
    currentMarketPrice: Number,
    priceVolatility: Number
  },
  riskFactors: [{
    factor: String,
    impact: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    description: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  forecastDate: {
    type: Date,
    required: true
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CropForecast', CropForecastSchema);
