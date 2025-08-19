const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Create a notification for a user
   * @param {String} userId - The user ID to send notification to
   * @param {Object} notificationData - The notification data
   */
  static async createNotification(userId, notificationData) {
    try {
      console.log('📬 Creating notification for user:', userId);
      console.log('📬 Notification data:', notificationData);
      
      const notification = new Notification({
        user: userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        category: notificationData.category || 'general',
        data: notificationData.data || {}
      });
      
      await notification.save();
      console.log('📬 Notification created successfully:', notification._id);
      return notification;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create inventory added notification
   */
  static async inventoryAdded(userId, inventoryData) {
    return await this.createNotification(userId, {
      title: '📦 Inventory Added Successfully',
      message: `${inventoryData.quantity} ${inventoryData.unit} of ${inventoryData.itemName} has been added to your inventory.`,
      type: 'success',
      category: 'inventory',
      data: {
        inventoryId: inventoryData.id,
        itemName: inventoryData.itemName,
        quantity: `${inventoryData.quantity} ${inventoryData.unit}`
      }
    });
  }

  /**
   * Create delivery request submitted notification
   */
  static async deliveryRequested(userId, deliveryData) {
    return await this.createNotification(userId, {
      title: '🚚 Delivery Request Submitted',
      message: `Your delivery request for ${deliveryData.quantity} ${deliveryData.unit || 'units'} of ${deliveryData.itemName} has been submitted with ${deliveryData.urgency || 'normal'} priority. Our admin team will review and assign the best warehouse for your goods.`,
      type: 'info',
      category: 'delivery',
      data: {
        deliveryId: deliveryData.id,
        itemName: deliveryData.itemName,
        quantity: `${deliveryData.quantity} ${deliveryData.unit || 'units'}`
      }
    });
  }

  /**
   * Create delivery approved notification
   */
  static async deliveryApproved(userId, deliveryData) {
    const estimatedDate = deliveryData.estimatedDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // Default 2 days from now
    
    return await this.createNotification(userId, {
      title: '✅ Delivery Request Approved',
      message: `Great news! Your delivery request for ${deliveryData.quantity} ${deliveryData.unit || 'units'} of ${deliveryData.itemName} has been approved. A transporter will be assigned to you soon.`,
      type: 'success',
      category: 'delivery',
      data: {
        deliveryId: deliveryData.id,
        itemName: deliveryData.itemName,
        quantity: `${deliveryData.quantity} ${deliveryData.unit || 'units'}`,
        estimatedDate: estimatedDate
      }
    });
  }

  /**
   * Create transporter assigned notification
   */
  static async transporterAssigned(userId, assignmentData) {
    const pickupDate = assignmentData.estimatedPickupDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default tomorrow
    
    return await this.createNotification(userId, {
      title: '🚛 Driver Has Been Assigned',
      message: `A driver has been assigned for your delivery of ${assignmentData.itemName}. ${assignmentData.transporterName || 'The driver'} will arrive on ${pickupDate.toLocaleDateString()} for pickup. Please ensure your goods are ready.`,
      type: 'info',
      category: 'transporter',
      data: {
        deliveryId: assignmentData.deliveryId,
        transporterId: assignmentData.transporterId,
        itemName: assignmentData.itemName,
        quantity: assignmentData.quantity,
        estimatedDate: pickupDate
      }
    });
  }

  /**
   * Create delivery in transit notification
   */
  static async deliveryInTransit(userId, transitData) {
    return await this.createNotification(userId, {
      title: '🚚 Delivery In Transit',
      message: `Your delivery of ${transitData.itemName} is now in transit. You can track the delivery status in your dashboard. Expected delivery: ${transitData.expectedDelivery || 'within 24-48 hours'}.`,
      type: 'info',
      category: 'delivery',
      data: {
        deliveryId: transitData.deliveryId,
        itemName: transitData.itemName,
        quantity: transitData.quantity
      }
    });
  }

  /**
   * Create delivery completed notification
   */
  static async deliveryCompleted(userId, completionData) {
    return await this.createNotification(userId, {
      title: '✅ Delivery Completed',
      message: `Your delivery of ${completionData.quantity} ${completionData.unit || 'units'} of ${completionData.itemName} has been successfully delivered to ${completionData.destination || 'the warehouse'}. Thank you for using AgriSync!`,
      type: 'success',
      category: 'delivery',
      data: {
        deliveryId: completionData.deliveryId,
        itemName: completionData.itemName,
        quantity: `${completionData.quantity} ${completionData.unit || 'units'}`
      }
    });
  }

  /**
   * Create general notification
   */
  static async general(userId, title, message, type = 'info') {
    return await this.createNotification(userId, {
      title,
      message,
      type,
      category: 'general'
    });
  }

  /**
   * Create system announcement notification
   */
  static async systemAnnouncement(userId, announcementData) {
    return await this.createNotification(userId, {
      title: `📢 ${announcementData.title}`,
      message: announcementData.message,
      type: announcementData.priority === 'high' ? 'warning' : 'info',
      category: 'general',
      data: {
        announcementId: announcementData.id
      }
    });
  }
}

module.exports = NotificationService;
