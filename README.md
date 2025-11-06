# VeaHome Mobile Application

A production-ready smart home mobile application built with React Native and Expo. VeaHome enables users to control and manage their smart devices through a unified IoT hub system, with features for energy management, scene automation, scheduling, and multi-home support.

## 🏗 Architecture Overview

The app follows a clean architecture pattern with clear separation of concerns:

```
App.tsx
├── AuthProvider (Context)
└── AppNavigator
    ├── AuthStack (Login/Signup)
    └── MainStack
        ├── MainTabs (Dashboard, Devices, Energy, Scenes, Settings)
        └── Modal Screens (HubPair, DeviceOnboarding, SceneForm, etc.)
```

## 📂 Code Structure

### **Entry Point: `App.tsx`**
- Root component that wraps the entire app
- Registers push notifications on startup
- Provides `SafeAreaProvider` and `AuthProvider`
- Entry point for Expo

### **Context Layer: `src/context/`**
- **`AuthContext.tsx`**: Global authentication state
  - Manages user login/logout/registration
  - Stores JWT token in AsyncStorage
  - Manages multi-home support (`homes`, `currentHomeId`)
  - Provides `loginDemo()` for testing without backend
  - Token restoration on app restart

### **Navigation: `src/navigation/AppNavigator.tsx`**
- Main navigation coordinator
- **Conditional Routing:**
  - If no token → Show `AuthStack` (Login/Signup)
  - If token but no `homeId` → Show HubPair screen
  - If token and `homeId` → Show `MainTabs`
- **MainTabs:** Bottom tab navigator (Dashboard, Devices, Energy, Scenes, Settings)
- **Stack Screens:** Modal screens for wizards, forms, details

### **Screens: `src/screens/`**

**Authentication:**
- **`LoginScreen.tsx`**: User login with email/password + demo mode button
- **`SignupScreen.tsx`**: User registration with name, email, password

**Main App:**
- **`DashboardScreen.tsx`**: 
  - Displays interactive floor plan (2D/3D toggle)
  - Shows room cards, device stats, energy overview
  - Real-time updates via WebSocket
  - 2D floor plan editor (drag rooms to reposition)
  - Uses `useHomeData` and `useEnergyData` hooks

- **`DevicesScreen.tsx`**: 
  - Tab-based device list (Lights, Climate, Windows, Media, Security)
  - Device tiles with on/off controls
  - "Add Device" button → navigates to onboarding
  - Real-time device state updates
  - Uses `useHomeData` and `useDeviceControl` hooks

- **`EnergyScreen.tsx`**: 
  - Energy consumption charts (day/week/month)
  - Category breakdowns (lighting, climate, media, security)
  - Line chart visualization using `react-native-chart-kit`
  - Real-time energy updates
  - Uses `useEnergyData` hook

- **`ScenesScreen.tsx`**: 
  - Lists active and inactive scenes
  - Create/Edit/Delete scenes
  - Activate scene functionality
  - Uses `ScenesApi` for CRUD operations

- **`SettingsScreen.tsx`**: 
  - User preferences (notifications, dark mode, etc.)
  - Home settings (add hub, network info)
  - Account management (logout)
  - Links to schedules, device groups, automations

**Wizards & Setup:**
- **`HubPairScreen.tsx`**: 
  - QR code scanner for hub pairing
  - Lazy camera loading (only opens on button press)
  - Calls `hubApi.pairHub()` with QR code
  - Navigates to HubSetup after pairing

- **`HubSetupWizard.tsx`**: 
  - Multi-step wizard (4 steps):
    1. Confirm hub pairing
    2. WiFi credentials input → `hubApi.connectWifi()`
    3. Room assignment (max 2 rooms) → `hubApi.assignRooms()`
    4. Success → Navigate to DeviceOnboarding

- **`DeviceOnboardingWizard.tsx`**: 
  - Multi-step wizard (5 steps):
    1. Select device type (light, AC, TV, blind, lock, camera, sensor)
    2. Configure device (name, category, room) → `hubApi.addDevice()`
    3. Learn signals (IR/RF) → `hubApi.learnSignal()` for each action
    4. WiFi device config (if WiFi device type)
    5. Device ready confirmation

**Management Screens:**
- **`SceneFormScreen.tsx`**: 
  - Create/edit scenes
  - Device selection with state configuration
  - Icon selection
  - Save/Update/Delete via `ScenesApi`

- **`SchedulesScreen.tsx`**: 
  - Lists schedules
  - Create/Delete schedules
  - Basic time-based scheduling UI
  - Uses `SchedulesApi`

- **`HomeSelectorScreen.tsx`**: 
  - Multi-home support
  - List and select homes
  - Create new home
  - Uses `HomesApi`

- **`DeviceGroupsScreen.tsx`**: 
  - Manage device groups
  - Create/Delete groups
  - Uses `DeviceGroupsApi`

- **`AutomationsScreen.tsx`**: 
  - Manage automation rules
  - Create/Delete automations
  - Basic time-triggered automation UI
  - Uses `AutomationsApi`

- **`DeviceHistoryScreen.tsx`**: 
  - Shows device event history
  - Timeline view of device state changes
  - Uses `DeviceHistoryApi`

**Detail Screens:**
- **`RoomDetailScreen.tsx`**: 
  - Room-specific controls and stats
  - Device list for the room
  - Climate controls (temperature, humidity)
  - Uses `HomeApi.getRoom()`

- **`ThermostatScreen.tsx`**: 
  - Climate control interface
  - Temperature adjustments

- **`ProfileScreen.tsx`**: 
  - User profile information

### **Components: `src/components/`**

- **`Header.tsx`**: Reusable header component with back button support
- **`DeviceTile.tsx`**: Device display tile with icon, name, status, controls
- **`RoomCard.tsx`**: Room information card with stats
- **`InteractiveFloorPlan.tsx`**: 
  - SVG-based 2D floor plan renderer
  - Edit mode: Drag rooms using PanResponder
  - Room stats display (temperature, humidity, lights, power)
  - Saves layout via `onLayoutUpdate` callback
  - Uses `roomsData` from constants for path definitions

- **`Model3DViewer.tsx`**: WebView wrapper for 3D model display (unused currently)

### **Hooks: `src/hooks/`**

All hooks follow a consistent pattern: fetch data, expose loading/error states, provide refresh function.

- **`useHomeData.ts`**: 
  - Fetches rooms and devices for a home
  - **Offline Support:** Caches in AsyncStorage, serves cached data when offline
  - Uses NetInfo to detect network status
  - Cache keys: `rooms_cache_{homeId}`, `devices_cache_{homeId}`
  - Returns: `{ rooms, devices, loading, error, refresh }`
  - Uses `currentHomeId` from AuthContext if `homeId` not provided

- **`useEnergyData.ts`**: 
  - Fetches energy consumption data
  - **Offline Support:** Per-range caching (`energy_cache_{homeId}_{range}`)
  - Time range: day/week/month
  - Returns: `{ energyData, loading, error, refresh }`

- **`useDeviceControl.ts`**: 
  - Controls device state (toggle, set value)
  - Calls `hubApi.controlDevice()`
  - Returns: `{ toggleDevice, setValue, loading }`

- **`useHubs.ts`**: 
  - Fetches list of hubs for a home
  - Returns: `{ hubs, loading, error, refresh }`

- **`useRealtime.ts`**: 
  - WebSocket connection wrapper
  - Connects on mount if `homeId` and `token` exist
  - Listens for `device:update`, `energy:update`, `hub:status` events
  - Calls refresh callbacks to update UI
  - Disconnects on unmount

### **Services: `src/services/`**

- **`api.ts`**: 
  - Centralized API client using Axios
  - `getApiClient()`: Creates authenticated Axios instance with token interceptor
  - API endpoints organized by domain:
    - `AuthApi`: Login, register, get current user
    - `HubApi`: Hub pairing, device management, WiFi setup, signal learning
    - `HomeApi`: Rooms, energy data, layout updates, 3D model URLs
    - `ScenesApi`: Scene CRUD operations
    - `SchedulesApi`: Schedule CRUD operations
    - `HomesApi`: Multi-home management
    - `DeviceGroupsApi`: Device group management
    - `AutomationsApi`: Automation rule management
    - `DeviceHistoryApi`: Device event history

- **`realtime.ts`**: 
  - WebSocket/MQTT client using Socket.IO
  - Singleton `realtimeService`
  - Connects with `homeId` and `token`
  - Listens for real-time events and forwards to handlers

- **`notifications.ts`**: 
  - Push notification registration
  - Requests permissions
  - Gets Expo push token
  - Android notification channel setup

### **Constants: `src/constants/`**

- **`theme.ts`**: 
  - Color scheme, spacing values, border radius, typography
  - Used consistently across all components

- **`rooms.ts`**: 
  - Room path definitions for SVG floor plan
  - Default room data structure

- **`mockData.ts`**: 
  - Fallback mock data (legacy, being replaced with API data)

### **Types: `src/types/index.ts`**

- TypeScript interfaces for all data structures
- Navigation parameter types
- Type safety across the app

## 🔄 Data Flow

### **Authentication Flow:**
1. User opens app → `AppNavigator` checks `AsyncStorage` for token
2. If no token → Show `LoginScreen`
3. User enters credentials → `AuthContext.login()` → Calls `AuthApi.login()`
4. Token saved to AsyncStorage → User data fetched via `auth.me()`
5. `AppNavigator` detects token → Shows `MainTabs` or `HubPair` (if no homeId)

### **Data Fetching Flow:**
1. Screen mounts → Calls hook (e.g., `useHomeData(homeId)`)
2. Hook checks network status (NetInfo)
3. If online → Fetches from API → Caches response in AsyncStorage
4. If offline → Serves from cache → Shows "Offline mode" error
5. Real-time updates via WebSocket refresh data automatically

### **Device Control Flow:**
1. User taps device tile → `handleDeviceToggle()` called
2. Calls `useDeviceControl().toggleDevice()` → `hubApi.controlDevice()`
3. Backend sends command to hub via MQTT
4. Hub executes command (IR/RF signal)
5. Hub reports state change → WebSocket emits `device:update` event
6. Frontend receives event → Refreshes device list

### **Scene Activation Flow:**
1. User activates scene → `scenesApi.activateScene(homeId, sceneId)`
2. Backend applies `deviceStates` to all devices in scene
3. Backend deactivates other scenes
4. WebSocket emits `device:update` for each changed device
5. Frontend updates UI to reflect scene state

## 🔌 Backend Integration

All API calls are defined in `src/services/api.ts`. The backend must implement:

**Base URL Configuration:**
- Set in `app.json` → `extra.apiBaseUrl`
- Or environment variable `EXPO_PUBLIC_API_BASE_URL`

**Authentication:**
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`

**Hub & Devices:**
- `POST /hub/pair`
- `GET /homes/:homeId/hubs`
- `POST /hubs/:hubId/wifi`
- `POST /hubs/:hubId/rooms`
- `GET /homes/:homeId/devices`
- `POST /homes/:homeId/devices`
- `POST /hubs/:hubId/devices/:deviceId/learn`
- `PUT /homes/:homeId/devices/:deviceId/control`

**Home & Rooms:**
- `GET /homes/:homeId`
- `GET /homes/:homeId/rooms`
- `PUT /homes/:homeId/layout`

**Energy:**
- `GET /homes/:homeId/energy?range=day|week|month`

**Scenes:**
- `GET/POST/PUT/DELETE /homes/:homeId/scenes`
- `PUT /homes/:homeId/scenes/:sceneId/activate`

**Schedules:**
- `GET/POST/PUT/DELETE /homes/:homeId/schedules`

**Multi-home:**
- `GET /homes` (list user's homes)
- `POST /homes` (create home)

**Device Groups:**
- `GET/POST/PUT/DELETE /homes/:homeId/device-groups`

**Automations:**
- `GET/POST/PUT/DELETE /homes/:homeId/automations`

**Device History:**
- `GET /homes/:homeId/devices/:deviceId/history?range=...`

**WebSocket Server:**
- Connect at `ws://{apiBaseUrl}`
- Auth via token in connection handshake
- Emit `device:update`, `energy:update`, `hub:status` events

## 📱 Key Features

✅ **Implemented:**
- User authentication (login/signup/demo mode)
- Hub pairing via QR code
- Device onboarding with signal learning
- Real-time device updates (WebSocket)
- Scene creation and management
- Energy tracking with charts
- Interactive 2D floor plan with drag editing
- 3D floor plan viewing (embedded WebView)
- Offline mode with caching
- Error handling and loading states
- Push notification registration
- Scheduling system (UI)
- Multi-home support (UI)
- Device groups (UI)
- Automation rules (UI)
- Device history (UI)

## 🛠 Development

```bash
# Install dependencies
npm install

# Start Expo development server
npx expo start

# Build for iOS (requires Apple Developer account)
eas build --platform ios

# Build for Android (requires Google Play account)
eas build --platform android
```

## 📦 Dependencies

**Core:**
- React Native & Expo SDK 54
- React Navigation (Stack & Tab navigators)
- TypeScript

**Networking:**
- Axios (HTTP client)
- Socket.IO Client (WebSocket)
- @react-native-community/netinfo (offline detection)

**UI:**
- Lucide React Native (icons)
- Expo Linear Gradient
- React Native Chart Kit (energy charts)
- React Native WebView (3D models)
- React Native SVG (floor plan)

**Storage:**
- @react-native-async-storage/async-storage (offline cache)

**Features:**
- Expo Barcode Scanner (QR code scanning)
- Expo Notifications (push notifications)

## 🔐 Security Considerations

- JWT tokens stored in AsyncStorage (encrypted by OS)
- API requests include `Authorization: Bearer {token}` header
- WebSocket authentication via token in connection handshake
- Camera permissions required only when scanning QR code
- Network requests use HTTPS/WSS (configure in backend)

## 📄 App Store Requirements

**iOS (`app.json`):**
- Bundle ID: `com.vealive.veahome`
- Camera permission description configured
- Supports tablet and phone

**Android (`app.json`):**
- Package: `com.vealive.veahome`
- Adaptive icon configured
- Notification channel created

**For Production:**
- Update `apiBaseUrl` in `app.json` to production server
- Configure Expo push notification credentials
- Set up EAS Build for app store builds
- Test on physical devices before submission

---

For detailed implementation checklist, see **TODO.md**



