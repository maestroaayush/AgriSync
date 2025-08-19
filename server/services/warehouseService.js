const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const User = require('../models/user');

class WarehouseService {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {Object} coord1 - {latitude, longitude}
   * @param {Object} coord2 - {latitude, longitude}
   * @returns {number} Distance in kilometers
   */
  static calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2 || !coord1.latitude || !coord1.longitude || !coord2.latitude || !coord2.longitude) {
      return Infinity; // If coordinates are missing, treat as infinitely far
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get current warehouse utilization
   * @param {string} warehouseLocation - Warehouse location name
   * @returns {Object} {currentStock, capacityLimit, utilizationRate, freeSpace}
   */
  static async getWarehouseUtilization(warehouseLocation) {
    try {
      // Get warehouse capacity
      const warehouse = await Warehouse.findOne({ location: warehouseLocation });
      if (!warehouse) {
        return null;
      }

      // Calculate current stock
      const inventoryTotal = await Inventory.aggregate([
        { $match: { location: warehouseLocation } },
        { $group: { _id: null, totalQuantity: { $sum: "$quantity" } } }
      ]);

      const currentStock = inventoryTotal.length > 0 ? inventoryTotal[0].totalQuantity : 0;
      const utilizationRate = warehouse.capacityLimit > 0 ? (currentStock / warehouse.capacityLimit) * 100 : 0;
      const freeSpace = warehouse.capacityLimit - currentStock;

      return {
        warehouse,
        currentStock,
        capacityLimit: warehouse.capacityLimit,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        freeSpace: Math.max(0, freeSpace)
      };
    } catch (error) {
      console.error('Error calculating warehouse utilization:', error);
      return null;
    }
  }

  /**
   * Find the best warehouse for a delivery based on proximity, capacity, and availability
   * @param {Object} farmerCoordinates - {latitude, longitude}
   * @param {number} deliveryQuantity - Quantity to be delivered
   * @param {string} itemType - Type of item being delivered (optional for future specialization)
   * @param {string} preferredLocation - Preferred warehouse location (optional)
   * @returns {Object} Best warehouse match with scoring details
   */
  static async findOptimalWarehouse(farmerCoordinates, deliveryQuantity, itemType = null, preferredLocation = null) {
    try {
      console.log('🔍 Finding optimal warehouse for delivery:', {
        farmerCoordinates,
        deliveryQuantity,
        itemType,
        preferredLocation
      });

      // Get all active warehouses
      const warehouses = await Warehouse.find({
        isManuallyAdded: true, // Only consider manually added warehouses
        capacityLimit: { $gt: 0 } // Must have capacity
      });

      if (warehouses.length === 0) {
        console.warn('⚠️ No active warehouses found');
        return null;
      }

      console.log(`📊 Evaluating ${warehouses.length} warehouses`);

      // Score each warehouse
      const warehouseScores = await Promise.all(
        warehouses.map(async (warehouse) => {
          const utilization = await this.getWarehouseUtilization(warehouse.location);
          
          if (!utilization || utilization.freeSpace < deliveryQuantity) {
            console.log(`❌ Warehouse ${warehouse.location} rejected: insufficient capacity (free: ${utilization?.freeSpace || 0}, needed: ${deliveryQuantity})`);
            return null; // Skip warehouses that can't accommodate the delivery
          }

          // Calculate distance (if coordinates are available)
          let distance = Infinity;
          let proximityScore = 0;

          if (warehouse.coordinates && farmerCoordinates) {
            distance = this.calculateDistance(farmerCoordinates, warehouse.coordinates);
            // Proximity score: higher score for closer warehouses (max 40 points)
            proximityScore = Math.max(0, 40 - (distance * 2)); // Lose 2 points per km
          } else {
            console.log(`⚠️ Missing coordinates for ${warehouse.location} or farmer`);
          }

          // Capacity score: higher score for warehouses with more free space (max 30 points)
          const capacityScore = Math.min(30, (utilization.freeSpace / utilization.capacityLimit) * 30);

          // Utilization score: prefer warehouses that are not too empty or too full (max 20 points)
          const utilizationScore = utilization.utilizationRate < 20 ? 10 : // Avoid very empty warehouses
                                   utilization.utilizationRate > 90 ? 5 :   // Avoid very full warehouses
                                   20; // Optimal utilization range

          // Preference bonus: if this is the preferred location (max 10 points)
          const preferenceScore = preferredLocation === warehouse.location ? 10 : 0;

          const totalScore = proximityScore + capacityScore + utilizationScore + preferenceScore;

          console.log(`📊 Warehouse ${warehouse.location} scored ${totalScore.toFixed(1)} points:`, {
            distance: distance === Infinity ? 'unknown' : `${distance.toFixed(1)}km`,
            proximityScore: proximityScore.toFixed(1),
            capacityScore: capacityScore.toFixed(1),
            utilizationScore,
            preferenceScore,
            utilization: `${utilization.utilizationRate.toFixed(1)}%`,
            freeSpace: utilization.freeSpace
          });

          return {
            warehouse,
            distance,
            utilization,
            scores: {
              proximity: proximityScore,
              capacity: capacityScore,
              utilization: utilizationScore,
              preference: preferenceScore,
              total: totalScore
            }
          };
        })
      );

      // Filter out null results and sort by total score
      const validWarehouses = warehouseScores
        .filter(score => score !== null)
        .sort((a, b) => b.scores.total - a.scores.total);

      if (validWarehouses.length === 0) {
        console.warn('⚠️ No suitable warehouses found for delivery');
        return null;
      }

      const bestWarehouse = validWarehouses[0];
      console.log(`✅ Selected warehouse: ${bestWarehouse.warehouse.location} (score: ${bestWarehouse.scores.total.toFixed(1)})`);

      return bestWarehouse;
    } catch (error) {
      console.error('❌ Error finding optimal warehouse:', error);
      return null;
    }
  }

  /**
   * Get warehouse manager for a specific warehouse location
   * @param {string} warehouseLocation - Warehouse location name
   * @returns {Object} Warehouse manager user object
   */
  static async getWarehouseManager(warehouseLocation) {
    try {
      // First, try to find a warehouse manager for the specific location
      let manager = await User.findOne({
        role: 'warehouse_manager',
        location: warehouseLocation
      });

      // If no specific manager found, get any warehouse manager
      if (!manager) {
        manager = await User.findOne({ role: 'warehouse_manager' });
        console.log(`📋 No specific manager for ${warehouseLocation}, using general manager: ${manager?.name || 'none'}`);
      } else {
        console.log(`📋 Found specific manager for ${warehouseLocation}: ${manager.name}`);
      }

      return manager;
    } catch (error) {
      console.error('Error finding warehouse manager:', error);
      return null;
    }
  }

  /**
   * Automatically add delivered goods to warehouse inventory
   * @param {Object} delivery - Delivery object
   * @param {Object} warehouseLocation - Warehouse location string
   * @param {Object} deliveredBy - User who delivered (transporter)
   * @returns {Object} Created inventory item
   */
  static async addDeliveryToWarehouseInventory(delivery, warehouseLocation, deliveredBy) {
    try {
      console.log('📦 Adding delivery to warehouse inventory:', {
        deliveryId: delivery._id,
        warehouseLocation,
        goods: delivery.goodsDescription,
        quantity: delivery.quantity
      });

      // Get warehouse manager
      const warehouseManager = await this.getWarehouseManager(warehouseLocation);
      if (!warehouseManager) {
        throw new Error(`No warehouse manager found for location: ${warehouseLocation}`);
      }

      // Create inventory item
      const inventoryItem = new Inventory({
        user: warehouseManager._id,
        itemName: delivery.goodsDescription,
        quantity: delivery.quantity,
        unit: delivery.unit || 'units',
        location: warehouseLocation,
        addedByRole: 'system', // Indicate this was added automatically
        description: `Auto-added from delivery ${delivery._id} completed by ${deliveredBy.name}`,
        sourceDelivery: delivery._id, // Link back to the delivery
        // Set reasonable defaults for auto-added items
        category: this.categorizeItem(delivery.goodsDescription),
        qualityGrade: 'Standard',
        status: 'available'
      });

      await inventoryItem.save();
      
      console.log('✅ Inventory item created:', inventoryItem._id);

      // Update delivery record
      delivery.receivedByWarehouse = true;
      delivery.warehouseReceivedAt = new Date();
      delivery.warehouseLocation = warehouseLocation;

      return inventoryItem;
    } catch (error) {
      console.error('❌ Error adding delivery to warehouse inventory:', error);
      throw error;
    }
  }

  /**
   * Simple item categorization based on name
   * @param {string} itemName - Name of the item
   * @returns {string} Category
   */
  static categorizeItem(itemName) {
    const name = itemName.toLowerCase();
    
    if (name.includes('rice') || name.includes('wheat') || name.includes('corn') || name.includes('barley')) {
      return 'grains';
    } else if (name.includes('tomato') || name.includes('onion') || name.includes('potato') || name.includes('carrot')) {
      return 'vegetables';
    } else if (name.includes('apple') || name.includes('mango') || name.includes('banana') || name.includes('orange')) {
      return 'fruits';
    } else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
      return 'dairy';
    } else {
      return 'other';
    }
  }

  /**
   * Get warehouse statistics for dashboard
   * @returns {Object} Warehouse statistics
   */
  static async getWarehouseStatistics() {
    try {
      const warehouses = await Warehouse.find({ isManuallyAdded: true });
      const stats = await Promise.all(
        warehouses.map(async (warehouse) => {
          const utilization = await this.getWarehouseUtilization(warehouse.location);
          return {
            location: warehouse.location,
            ...utilization
          };
        })
      );

      const totalCapacity = stats.reduce((sum, stat) => sum + stat.capacityLimit, 0);
      const totalUsed = stats.reduce((sum, stat) => sum + stat.currentStock, 0);
      const avgUtilization = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

      return {
        warehouses: stats,
        summary: {
          totalWarehouses: warehouses.length,
          totalCapacity,
          totalUsed,
          totalFree: totalCapacity - totalUsed,
          avgUtilization: Math.round(avgUtilization * 100) / 100
        }
      };
    } catch (error) {
      console.error('Error getting warehouse statistics:', error);
      return null;
    }
  }
}

module.exports = WarehouseService;
