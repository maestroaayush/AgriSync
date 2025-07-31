const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:5000'
  },
  production: {
    baseURL: import.meta.env.VITE_API_URL || 'https://your-production-api.com'
  }
};

const environment = import.meta.env.MODE || 'development';

export const API_BASE_URL = API_CONFIG[environment].baseURL;

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    protected: '/api/protected'
  },
  inventory: {
    base: '/api/inventory',
    location: (location) => `/api/inventory/location/${location}`,
    logs: '/api/inventory/logs/recent',
    available: '/api/inventory/available'
  },
  deliveries: '/api/deliveries',
  warehouses: '/api/warehouse',
  orders: '/api/orders',
  notifications: {
    base: '/api/notifications',
    markRead: '/api/notifications/mark-read'
  },
  reports: '/api/reports',
  users: '/api/users',
  summary: '/api/summary',
  export: {
    inventory: '/api/export/inventory',
    inventoryPdf: '/api/export/inventory/pdf',
    deliveries: '/api/export/deliveries',
    orders: '/api/export/orders',
    warehouseSummary: '/api/export/warehouse-summary'
  }
};

export default API_CONFIG;
