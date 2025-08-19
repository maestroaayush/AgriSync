import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.currentUserId = null;
  }

  connect(userId) {
    // If already connected to the same user, return existing socket
    if (this.socket && this.isConnected && this.currentUserId === userId) {
      console.log('Socket already connected for user:', userId);
      return Promise.resolve(this.socket);
    }

    // If connecting to a different user, disconnect first
    if (this.socket && this.currentUserId && this.currentUserId !== userId) {
      console.log('Switching user, disconnecting previous connection');
      this.disconnect(this.currentUserId);
    }

    // If already connecting, return existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.currentUserId = userId;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log('Creating new Socket.IO connection for user:', userId);
        
        this.socket = io("http://localhost:5000", {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 20000,
          forceNew: false
        });

        this.socket.on('connect', () => {
          console.log('Socket.IO connected successfully for user:', userId);
          this.isConnected = true;
          if (userId) {
            this.socket.emit("join-delivery-tracking", userId);
          }
          resolve(this.socket);
        });

        this.socket.on('disconnect', () => {
          console.log('Socket.IO disconnected for user:', userId);
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
          this.isConnected = false;
          this.connectionPromise = null;
          reject(error);
        });

      } catch (error) {
        console.error('Failed to create Socket.IO connection:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect(userId) {
    if (this.socket && this.isConnected) {
      console.log('Disconnecting Socket.IO for user:', userId);
      if (userId) {
        this.socket.emit("leave-delivery-tracking", userId);
      }
      this.socket.close();
    }
    
    this.socket = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.currentUserId = null;
  }

  getSocket() {
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }
}

// Export a singleton instance
export default new SocketService();
