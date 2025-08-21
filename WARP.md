# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

AgriSync is a full-stack agricultural supply chain management system built with React + Vite (client) and Node.js + Express + MongoDB (server). It enables farmers, transporters, warehouse managers, market vendors, and administrators to collaborate in managing agricultural products through the supply chain.

## Architecture

### Full-Stack Structure
```
AgriSync/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express backend
└── [documentation and test files]
```

### Client Architecture (React + Vite)
- **Framework**: React 19 with Vite 6 for development and building
- **Routing**: React Router DOM with role-based protected routes
- **Styling**: TailwindCSS 4 with custom components
- **State Management**: React Context (AuthContext) + local component state
- **Maps**: Leaflet with react-leaflet for geolocation features
- **Real-time**: Socket.IO client for live updates
- **HTTP Client**: Axios with proxy configuration to backend

**Key Directories:**
- `src/pages/dashboards/` - Role-specific dashboard components (Farmer, Transporter, Warehouse, Vendor, Admin)
- `src/components/` - Reusable UI components
- `src/context/` - React contexts (AuthContext for user authentication)
- `src/services/` - Service layer (socketService.js for WebSocket communication)
- `src/routes/` - Route protection and navigation logic

### Server Architecture (Node.js + Express)
- **Framework**: Express.js with comprehensive middleware stack
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with Google OAuth + local auth
- **Real-time**: Socket.IO server for live updates
- **Security**: Helmet, CORS, rate limiting, session management
- **File Processing**: Multer for uploads, PDFKit for reports, XLSX for exports

**Key Directories:**
- `routes/` - API endpoints organized by domain (auth, inventory, delivery, etc.)
- `models/` - Mongoose schemas (User, Inventory, Delivery, Warehouse, etc.)
- `controllers/` - Business logic handlers
- `middleware/` - Custom middleware (audit logging, authentication)
- `services/` - Service layer (auditService, etc.)
- `config/` - Configuration files (passport, database)

### Database Models
Core entities include User, Inventory, Delivery, Warehouse, Order, OutgoingInventory, Notification, AuditLog, Announcement, and specialized models for supply chain tracing and smart contracts.

### User Roles & Dashboards
The system supports five user roles with dedicated dashboards:
- `farmer` → `/farmer/dashboard`
- `transporter` → `/transporter/dashboard` 
- `warehouse_manager` → `/warehouse_manager/dashboard`
- `market_vendor` → `/market_vendor/dashboard`
- `admin` → `/admin/dashboard`

## Development Commands

### Client (React + Vite)
```bash
cd client/
npm run dev          # Start development server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Server (Node.js + Express)
```bash
cd server/
npm start           # Start production server
npm run dev         # Start with nodemon (auto-restart)
```

### Full-Stack Development
1. **Start the backend**: `cd server && npm run dev` (runs on port 5000)
2. **Start the frontend**: `cd client && npm run dev` (runs on port 5173)
3. The Vite dev server proxies `/api/*` requests to the backend server

## Key Development Patterns

### Authentication Flow
- OAuth with Google + local registration
- JWT tokens with session management
- Role-based route protection using `PrivateRoute` component
- AuthContext provides user state throughout the app

### Real-time Communication
- Socket.IO for live updates across dashboards
- Server broadcasts events for inventory changes, deliveries, notifications
- Client subscribes to events based on user role and permissions

### API Structure
RESTful APIs organized by domain:
- `/api/auth/*` - Authentication and user management
- `/api/inventory/*` - Inventory operations
- `/api/delivery/*` - Delivery tracking and management
- `/api/warehouse/*` - Warehouse operations
- `/api/orders/*` - Order management
- `/api/reports/*` - Analytics and reporting
- Additional routes for farmers, transporters, vendors, admin operations

### Security Features
- Rate limiting (stricter for auth endpoints)
- CORS configuration for allowed origins
- Helmet for security headers
- Input validation with express-validator
- Audit logging for all operations
- File upload restrictions and validation

### Geolocation Integration
- Leaflet maps for warehouse/farmer location tracking
- Coordinate storage and validation
- Route optimization for deliveries
- Location-based features throughout the application

## Environment Setup

### Required Environment Variables (.env)
**Server:**
- `MONGODB_URI` - MongoDB connection string
- `SESSION_SECRET` - Session encryption key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `JWT_SECRET` - JWT token signing key
- `NODE_ENV` - Environment (development/production)

**Client:**
- Development proxy automatically routes to `http://localhost:5000`
- Vite configuration handles API proxying

## Testing and Quality

### Available Tools
- **Linting**: ESLint configured for React/JSX
- **Development**: Multiple test scripts and debugging utilities in root directory
- **Hot Reload**: Vite HMR for client, nodemon for server
- **Rate Limit Testing**: Development endpoint `/api/dev/reset-rate-limit`

### Code Quality
- ESLint rules enforced for React hooks and component patterns
- TailwindCSS for consistent styling
- Modular component architecture
- Clear separation of concerns between client/server

## Production Considerations

- Rate limiting is stricter in production
- Secure cookies and HTTPS enforcement
- Static file serving for uploads
- Socket.IO configured for production scaling
- MongoDB connection with proper error handling
- Comprehensive audit logging for compliance

## Common Development Tasks

1. **Adding new user role**: Update `PrivateRoute`, create dashboard component, add route in `App.jsx`
2. **New API endpoint**: Create route file, add to `server.js`, implement controller logic
3. **Database changes**: Update Mongoose models, handle migrations if needed
4. **New real-time feature**: Add Socket.IO events in server, subscribe in relevant client components
5. **UI components**: Add to `components/` directory, follow existing TailwindCSS patterns
