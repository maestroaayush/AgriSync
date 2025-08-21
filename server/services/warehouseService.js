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

      // Get all active warehouses (both manually added and auto-created)
      const warehouses = await Warehouse.find({
        capacityLimit: { $gt: 0 } // Must have capacity
      }).populate('manager', 'name location coordinates');

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
      // Try to find a warehouse manager for this location; if none, fall back to an admin; if none, fall back to the delivering user
      let warehouseManager = await this.getWarehouseManager(warehouseLocation);
      if (!warehouseManager) {
        const adminFallback = await User.findOne({ role: 'admin' });
        if (adminFallback) {
          console.log(`📋 Using admin fallback as inventory owner for ${warehouseLocation}: ${adminFallback.name}`);
          warehouseManager = adminFallback;
        } else if (deliveredBy) {
          console.log(`📋 Using delivering user as inventory owner fallback: ${deliveredBy.name}`);
          warehouseManager = deliveredBy;
        } else {
          throw new Error(`No suitable user found to own inventory at location: ${warehouseLocation}`);
        }
      }

      // Create inventory item
      const inventoryItem = new Inventory({
        user: warehouseManager._id,
        itemName: delivery.goodsDescription,
        quantity: delivery.quantity,
        unit: delivery.unit || 'units',
        location: warehouseLocation,
        addedByRole: 'system', // Indicate this was added automatically
        description: `Auto-added from delivery ${delivery._id} completed by ${deliveredBy?.name || 'system'}`,
        sourceDelivery: delivery._id, // Link back to the delivery
        // Set reasonable defaults for auto-added items
        category: this.categorizeItem(delivery.goodsDescription),
        qualityGrade: 'Standard',
        status: 'available'
      });

      await inventoryItem.save();
      
      console.log('✅ Inventory item created:', inventoryItem._id);

      // Update warehouse capacity
      await this.updateWarehouseCapacity(warehouseLocation, delivery.quantity, 'add');

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
   * Update warehouse capacity when inventory is added or removed
   * @param {string} warehouseLocation - Warehouse location
   * @param {number} quantity - Quantity to add or remove
   * @param {string} operation - 'add' or 'remove'
   */
  static async updateWarehouseCapacity(warehouseLocation, quantity, operation = 'add') {
    try {
      console.log(`🔄 Updating warehouse capacity: ${warehouseLocation}, ${quantity} ${operation}`);
      
      const warehouse = await Warehouse.findOne({ location: warehouseLocation });
      if (!warehouse) {
        console.warn(`⚠️ Warehouse not found for location: ${warehouseLocation}`);
        return null;
      }

      const quantityNum = parseFloat(quantity) || 0;
      
      if (operation === 'add') {
        warehouse.currentCapacity += quantityNum;
        // Ensure we don't exceed capacity limit
        if (warehouse.currentCapacity > warehouse.capacityLimit) {
          console.warn(`⚠️ Warehouse ${warehouseLocation} capacity exceeded! Current: ${warehouse.currentCapacity}, Limit: ${warehouse.capacityLimit}`);
        }
      } else if (operation === 'remove') {
        warehouse.currentCapacity -= quantityNum;
        // Ensure we don't go below zero
        warehouse.currentCapacity = Math.max(0, warehouse.currentCapacity);
      }

      await warehouse.save();
      
      console.log(`✅ Warehouse ${warehouseLocation} capacity updated: ${warehouse.currentCapacity}/${warehouse.capacityLimit} (${Math.round((warehouse.currentCapacity / warehouse.capacityLimit) * 100)}%)`);
      
      return warehouse;
    } catch (error) {
      console.error('❌ Error updating warehouse capacity:', error);
      throw error;
    }
  }

  /**
   * Handle delivery from warehouse to vendor (remove from warehouse inventory)
   * @param {Object} delivery - Delivery object
   * @param {string} warehouseLocation - Source warehouse location
   * @param {Object} deliveredBy - User who delivered (transporter)
   * @returns {Object} Updated information
   */
  static async removeDeliveryFromWarehouseInventory(delivery, warehouseLocation, deliveredBy) {
    try {
      console.log('📤 Removing delivery from warehouse inventory:', {
        deliveryId: delivery._id,
        warehouseLocation,
        goods: delivery.goodsDescription,
        quantity: delivery.quantity
      });

      // Find matching inventory items to reduce/remove
      const inventoryItems = await Inventory.find({
        location: warehouseLocation,
        itemName: delivery.goodsDescription,
        status: 'available'
      }).sort({ createdAt: 1 }); // First in, first out

      if (inventoryItems.length === 0) {
        throw new Error(`No available inventory found for ${delivery.goodsDescription} at ${warehouseLocation}`);
      }

      let remainingToRemove = delivery.quantity;
      const updatedItems = [];
      const removedItems = [];

      for (const item of inventoryItems) {
        if (remainingToRemove <= 0) break;

        if (item.quantity <= remainingToRemove) {
          // Remove entire item
          remainingToRemove -= item.quantity;
          await Inventory.findByIdAndDelete(item._id);
          removedItems.push(item);
        } else {
          // Reduce item quantity
          item.quantity -= remainingToRemove;
          item.notes = `${item.notes || ''} - ${remainingToRemove} units delivered on ${new Date().toISOString()}`;
          await item.save();
          updatedItems.push(item);
          remainingToRemove = 0;
        }
      }

      if (remainingToRemove > 0) {
        throw new Error(`Insufficient inventory: ${remainingToRemove} units could not be removed from ${warehouseLocation}`);
      }

      // Update warehouse capacity
      await this.updateWarehouseCapacity(warehouseLocation, delivery.quantity, 'remove');

      // Create inventory record for vendor
      await this.addDeliveryToVendorInventory(delivery, deliveredBy);

      console.log(`✅ Successfully removed ${delivery.quantity} units from ${warehouseLocation}`);
      
      return {
        removedItems,
        updatedItems,
        totalRemoved: delivery.quantity
      };
    } catch (error) {
      console.error('❌ Error removing delivery from warehouse inventory:', error);
      throw error;
    }
  }

  /**
   * Remove delivered goods from farmer inventory
   * @param {Object} delivery - Delivery object
   * @param {Object} deliveredBy - User who delivered (transporter)
   * @returns {Object} Information about removed items
   */
  static async removeDeliveryFromFarmerInventory(delivery, deliveredBy) {
    try {
      console.log('🌾 Removing delivery from farmer inventory:', {
        deliveryId: delivery._id,
        farmer: delivery.farmer,
        goods: delivery.goodsDescription,
        quantity: delivery.quantity
      });

      // Find farmer's inventory items that match the delivery
      const inventoryItems = await Inventory.find({
        user: delivery.farmer,
        itemName: delivery.goodsDescription,
        status: 'available',
        quantity: { $gt: 0 }
      }).sort({ createdAt: 1 }); // First in, first out

      if (inventoryItems.length === 0) {
        console.warn(`⚠️ No available inventory found for ${delivery.goodsDescription} in farmer's stock`);
        // Don't throw error - delivery can still complete even if farmer inventory tracking is incomplete
        return {
          removedItems: [],
          updatedItems: [],
          totalRemoved: 0,
          warning: `No farmer inventory found for ${delivery.goodsDescription}`
        };
      }

      let remainingToRemove = delivery.quantity;
      const updatedItems = [];
      const removedItems = [];

      for (const item of inventoryItems) {
        if (remainingToRemove <= 0) break;

        if (item.quantity <= remainingToRemove) {
          // Remove entire item
          remainingToRemove -= item.quantity;
          await Inventory.findByIdAndDelete(item._id);
          removedItems.push({
            itemId: item._id,
            itemName: item.itemName,
            quantityRemoved: item.quantity,
            location: item.location
          });
          console.log(`🗑️ Removed entire inventory item: ${item.itemName} (${item.quantity} ${item.unit})`);
        } else {
          // Reduce item quantity
          const quantityRemoved = remainingToRemove;
          item.quantity -= remainingToRemove;
          item.notes = `${item.notes || ''} - ${quantityRemoved} units delivered via delivery ${delivery._id} on ${new Date().toISOString()}`;
          await item.save();
          updatedItems.push({
            itemId: item._id,
            itemName: item.itemName,
            quantityRemoved,
            remainingQuantity: item.quantity,
            location: item.location
          });
          console.log(`📉 Reduced inventory item: ${item.itemName} (removed ${quantityRemoved}, remaining ${item.quantity} ${item.unit})`);
          remainingToRemove = 0;
        }
      }

      const totalRemoved = delivery.quantity - remainingToRemove;

      if (remainingToRemove > 0) {
        console.warn(`⚠️ Partial farmer inventory removal: ${remainingToRemove} units could not be removed from farmer's inventory`);
        // Don't throw error - partial removal is acceptable
      }

      console.log(`✅ Successfully removed ${totalRemoved} units from farmer's inventory`);
      
      return {
        removedItems,
        updatedItems,
        totalRemoved,
        partialRemoval: remainingToRemove > 0 ? remainingToRemove : null
      };
    } catch (error) {
      console.error('❌ Error removing delivery from farmer inventory:', error);
      throw error;
    }
  }

  /**
   * Add delivered goods to vendor inventory
   * @param {Object} delivery - Delivery object
   * @param {Object} deliveredBy - User who delivered (transporter)
   * @returns {Object} Created inventory item
   */
  static async addDeliveryToVendorInventory(delivery, deliveredBy) {
    try {
      console.log('🏪 Adding delivery to vendor inventory:', {
        deliveryId: delivery._id,
        vendor: delivery.vendor,
        requestedBy: delivery.requestedBy,
        goods: delivery.goodsDescription,
        quantity: delivery.quantity
      });

      // Get vendor information - check both vendor and requestedBy fields
      const vendorId = delivery.vendor || delivery.requestedBy;
      if (!vendorId) {
        console.warn('⚠️ No vendor ID found in delivery, skipping vendor inventory creation');
        return null;
      }
      
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        console.warn(`⚠️ Vendor ${vendorId} not found for delivery ${delivery._id}`);
        return null;
      }

      // Create inventory item for vendor
      const inventoryItem = new Inventory({
        user: vendor._id,
        itemName: delivery.goodsDescription,
        quantity: delivery.quantity,
        unit: delivery.unit || 'units',
        location: vendor.location || 'Market Location',
        addedByRole: 'system',
        description: `Auto-added from delivery ${delivery._id} completed by ${deliveredBy?.name || 'system'}`,
        sourceDelivery: delivery._id,
        category: this.categorizeItem(delivery.goodsDescription),
        qualityGrade: 'Standard',
        status: 'available'
      });

      await inventoryItem.save();
      
      console.log('✅ Vendor inventory item created:', inventoryItem._id);
      
      return inventoryItem;
    } catch (error) {
      console.error('❌ Error adding delivery to vendor inventory:', error);
      throw error;
    }
  }

  /**
   * Check if a location is a warehouse location
   * @param {string} location - Location to check
   * @returns {boolean} True if location is a warehouse
   */
  static async isWarehouseLocation(location) {
    try {
      if (!location || typeof location !== 'string') {
        return false;
      }

      const warehouse = await Warehouse.findOne({ 
        location: { $regex: location.trim(), $options: 'i' } 
      });
      
      return !!warehouse;
    } catch (error) {
      console.error('Error checking warehouse location:', error);
      return false;
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

  /**
   * Get warehouses managed by a specific warehouse manager
   * @param {string} managerId - Warehouse manager's user ID
   * @returns {Array} Array of warehouses managed by this user
   */
  static async getWarehousesByManager(managerId) {
    try {
      const warehouses = await Warehouse.find({ manager: managerId });
      return warehouses;
    } catch (error) {
      console.error('Error getting warehouses by manager:', error);
      return [];
    }
  }

  /**
   * Manually add inventory item to warehouse (by warehouse manager)
   * @param {Object} itemData - Inventory item data
   * @param {Object} warehouseManager - Warehouse manager user object
   * @param {string} reason - Reason for manual addition
   * @returns {Object} Created inventory item
   */
  static async manuallyAddInventory(itemData, warehouseManager, reason = 'Manual addition') {
    try {
      console.log('📦 Manually adding inventory to warehouse:', {
        itemName: itemData.itemName,
        quantity: itemData.quantity,
        location: itemData.location,
        addedBy: warehouseManager.name,
        reason
      });

      // Verify warehouse manager has access to this location
      // First check if there's a warehouse with this manager assigned
      let warehouse = await Warehouse.findOne({ 
        location: itemData.location,
        manager: warehouseManager._id 
      });

      // If no warehouse with manager assigned, check if user's location matches
      if (!warehouse && warehouseManager.role === 'warehouse_manager') {
        // Check if user's location matches the target location
        if (warehouseManager.location === itemData.location) {
          // Allow operation for warehouse manager at same location
          console.log('✅ Allowing warehouse manager operation based on location match');
          // Try to find the warehouse by location only
          warehouse = await Warehouse.findOne({ location: itemData.location });
          if (!warehouse) {
            // Create a default warehouse entry if it doesn't exist
            console.log('📦 Creating default warehouse for location:', itemData.location);
            warehouse = new Warehouse({
              location: itemData.location,
              capacityLimit: 10000, // Default capacity
              manager: warehouseManager._id,
              isManuallyAdded: true,
              addedBy: warehouseManager._id
            });
            await warehouse.save();
          }
        } else {
          throw new Error(`Warehouse manager ${warehouseManager.name} (location: ${warehouseManager.location}) does not have access to location: ${itemData.location}`);
        }
      } else if (!warehouse) {
        throw new Error(`User ${warehouseManager.name} is not authorized to add inventory to location: ${itemData.location}`);
      }

      // Check warehouse capacity
      const utilization = await this.getWarehouseUtilization(itemData.location);
      if (utilization && utilization.freeSpace < itemData.quantity) {
        throw new Error(`Insufficient warehouse capacity. Available: ${utilization.freeSpace}, Required: ${itemData.quantity}`);
      }

      // Create inventory item
      const inventoryItem = new Inventory({
        user: warehouseManager._id,
        itemName: itemData.itemName,
        quantity: parseInt(itemData.quantity),
        unit: itemData.unit || 'units',
        location: itemData.location,
        category: itemData.category || this.categorizeItem(itemData.itemName),
        price: parseFloat(itemData.price) || 0,
        qualityGrade: itemData.qualityGrade || 'Standard',
        qualityCertification: itemData.qualityCertification || '',
        description: itemData.description || `${reason} by ${warehouseManager.name}`,
        harvestDate: itemData.harvestDate ? new Date(itemData.harvestDate) : null,
        expiryDate: itemData.expiryDate ? new Date(itemData.expiryDate) : null,
        addedByRole: 'warehouse_manager',
        status: 'available',
        manualEntry: true,
        manualEntryReason: reason
      });

      await inventoryItem.save();

      // Update warehouse capacity
      await this.updateWarehouseCapacity(itemData.location, itemData.quantity, 'add');

      console.log('✅ Manual inventory item created:', inventoryItem._id);
      return inventoryItem;
    } catch (error) {
      console.error('❌ Error manually adding inventory:', error);
      throw error;
    }
  }

  /**
   * Manually remove/dispose inventory item (by warehouse manager)
   * @param {string} inventoryItemId - Inventory item ID to remove
   * @param {Object} warehouseManager - Warehouse manager user object
   * @param {string} reason - Reason for removal (damaged, spoiled, etc.)
   * @param {number} quantityToRemove - Specific quantity to remove (optional, removes entire item if not specified)
   * @returns {Object} Removal details
   */
  static async manuallyRemoveInventory(inventoryItemId, warehouseManager, reason = 'Manual removal', quantityToRemove = null) {
    try {
      console.log('🗑️ Manually removing inventory from warehouse:', {
        inventoryItemId,
        quantityToRemove,
        removedBy: warehouseManager.name,
        userRole: warehouseManager.role,
        userLocation: warehouseManager.location,
        reason
      });

      // Find the inventory item
      const inventoryItem = await Inventory.findById(inventoryItemId);
      if (!inventoryItem) {
        console.error(`❌ Inventory item not found with ID: ${inventoryItemId}`);
        throw new Error('Inventory item not found');
      }
      
      console.log('📄 Found inventory item:', {
        itemName: inventoryItem.itemName,
        itemLocation: inventoryItem.location,
        quantity: inventoryItem.quantity
      });

      // Verify warehouse manager has access to this location
      const warehouse = await Warehouse.findOne({ 
        location: inventoryItem.location,
        manager: warehouseManager._id 
      });

      // More flexible check - allow if user is warehouse_manager for that location
      if (!warehouse && warehouseManager.role === 'warehouse_manager') {
        // Check if user's location matches the inventory location
        if (warehouseManager.location === inventoryItem.location) {
          // Allow operation for warehouse manager at same location
          console.log('✅ Allowing warehouse manager operation based on location match');
        } else {
          throw new Error(`Warehouse manager ${warehouseManager.name} does not have access to location: ${inventoryItem.location}`);
        }
      } else if (!warehouse && warehouseManager.role !== 'warehouse_manager') {
        throw new Error(`User ${warehouseManager.name} is not a warehouse manager and does not have access to location: ${inventoryItem.location}`);
      }

      let actualQuantityRemoved;
      let inventoryAction;

      if (quantityToRemove && quantityToRemove < inventoryItem.quantity) {
        // Partial removal - reduce quantity
        actualQuantityRemoved = quantityToRemove;
        inventoryItem.quantity -= quantityToRemove;
        inventoryItem.notes = `${inventoryItem.notes || ''} - ${quantityToRemove} units removed on ${new Date().toISOString()} (${reason})`;
        await inventoryItem.save();
        inventoryAction = 'quantity_reduced';
        console.log(`📉 Reduced inventory quantity: ${inventoryItem.itemName} (removed ${quantityToRemove}, remaining ${inventoryItem.quantity})`);
      } else {
        // Full removal - delete entire item
        actualQuantityRemoved = inventoryItem.quantity;
        await Inventory.findByIdAndDelete(inventoryItemId);
        inventoryAction = 'item_removed';
        console.log(`🗑️ Removed entire inventory item: ${inventoryItem.itemName} (${actualQuantityRemoved} units)`);
      }

      // Update warehouse capacity
      await this.updateWarehouseCapacity(inventoryItem.location, actualQuantityRemoved, 'remove');

      console.log(`✅ Successfully removed ${actualQuantityRemoved} units from ${inventoryItem.location}`);
      
      return {
        inventoryItemId,
        itemName: inventoryItem.itemName,
        quantityRemoved: actualQuantityRemoved,
        remainingQuantity: inventoryAction === 'quantity_reduced' ? inventoryItem.quantity : 0,
        location: inventoryItem.location,
        reason,
        action: inventoryAction,
        removedBy: warehouseManager.name,
        removedAt: new Date()
      };
    } catch (error) {
      console.error('❌ Error manually removing inventory:', error);
      throw error;
    }
  }

  /**
   * Adjust inventory quantity with audit trail
   * @param {string} inventoryItemId - Inventory item ID to adjust
   * @param {Object} warehouseManager - Warehouse manager user object
   * @param {number} quantityChange - Positive for increase, negative for decrease
   * @param {string} reason - Reason for adjustment
   * @returns {Object} Adjustment details
   */
  static async adjustInventoryQuantity(inventoryItemId, warehouseManager, quantityChange, reason = 'Manual adjustment') {
    try {
      console.log('🔧 Adjusting inventory quantity:', {
        inventoryItemId,
        quantityChange,
        adjustedBy: warehouseManager.name,
        reason
      });

      // Find the inventory item
      const inventoryItem = await Inventory.findById(inventoryItemId);
      if (!inventoryItem) {
        throw new Error('Inventory item not found');
      }

      // Verify warehouse manager has access to this location
      const warehouse = await Warehouse.findOne({ 
        location: inventoryItem.location,
        manager: warehouseManager._id 
      });

      // More flexible check - allow if user is warehouse_manager for that location
      if (!warehouse && warehouseManager.role === 'warehouse_manager') {
        // Check if user's location matches the inventory location
        if (warehouseManager.location === inventoryItem.location) {
          // Allow operation for warehouse manager at same location
          console.log('✅ Allowing warehouse manager operation based on location match');
        } else {
          throw new Error(`Warehouse manager ${warehouseManager.name} does not have access to location: ${inventoryItem.location}`);
        }
      } else if (!warehouse && warehouseManager.role !== 'warehouse_manager') {
        throw new Error(`User ${warehouseManager.name} is not a warehouse manager and does not have access to location: ${inventoryItem.location}`);
      }

      const originalQuantity = inventoryItem.quantity;
      const newQuantity = originalQuantity + quantityChange;

      // Ensure quantity doesn't go negative
      if (newQuantity < 0) {
        throw new Error(`Cannot reduce quantity by ${Math.abs(quantityChange)}. Current quantity is only ${originalQuantity}`);
      }

      // Check warehouse capacity if increasing
      if (quantityChange > 0) {
        const utilization = await this.getWarehouseUtilization(inventoryItem.location);
        if (utilization && utilization.freeSpace < quantityChange) {
          throw new Error(`Insufficient warehouse capacity. Available: ${utilization.freeSpace}, Required: ${quantityChange}`);
        }
      }

      // Update inventory item
      inventoryItem.quantity = newQuantity;
      inventoryItem.notes = `${inventoryItem.notes || ''} - Quantity ${quantityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(quantityChange)} on ${new Date().toISOString()} (${reason})`;
      await inventoryItem.save();

      // Update warehouse capacity
      const operation = quantityChange > 0 ? 'add' : 'remove';
      await this.updateWarehouseCapacity(inventoryItem.location, Math.abs(quantityChange), operation);

      console.log(`✅ Inventory quantity adjusted: ${inventoryItem.itemName} (${originalQuantity} → ${newQuantity})`);
      
      return {
        inventoryItemId,
        itemName: inventoryItem.itemName,
        originalQuantity,
        newQuantity,
        quantityChange,
        location: inventoryItem.location,
        reason,
        adjustedBy: warehouseManager.name,
        adjustedAt: new Date()
      };
    } catch (error) {
      console.error('❌ Error adjusting inventory quantity:', error);
      throw error;
    }
  }
}

module.exports = WarehouseService;
