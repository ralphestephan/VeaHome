# TODO - Implementation Checklist for App Store Deployment

This document provides a detailed breakdown of what's missing for production deployment and where to implement each feature. All items are organized by priority and include specific file locations and implementation details.

## 🔴 CRITICAL - Must Implement Before Deployment

### 1. Backend API Server (All Endpoints)

**Status:** Frontend is 100% ready, backend needs full implementation

**Location:** Your backend server (Node.js, Python, etc.)

All endpoints are defined in `src/services/api.ts`. You must implement these on your backend:

#### Authentication Endpoints
**File:** `src/services/api.ts` - `AuthApi`  
**Must Implement:**
- `POST /auth/login`
  - **Payload:** `{ email: string, password: string }`
  - **Response:** `{ token: string, user: User }`
  - **Used in:** `src/screens/Auth/LoginScreen.tsx` (line ~50)
  - **Backend Requirements:**
    - Validate credentials
    - Return JWT token with user ID
    - Return user object with `{ id, name, email, homeId }`
    - Include `homes` array in response if multi-home enabled

- `POST /auth/register`
  - **Payload:** `{ name: string, email: string, password: string }`
  - **Response:** `{ token: string, user: User }`
  - **Used in:** `src/screens/Auth/SignupScreen.tsx` (line ~50)
  - **Backend Requirements:**
    - Hash password (bcrypt, argon2, etc.)
    - Create user in database
    - Return JWT token and user object
    - Create default home for user

- `GET /auth/me`
  - **Headers:** `Authorization: Bearer {token}`
  - **Response:** `{ user: User, homes?: Home[] }`
  - **Used in:** `src/context/AuthContext.tsx` (line ~54)
  - **Backend Requirements:**
    - Validate JWT token
    - Return current user data
    - Optionally return `homes` array for multi-home support

#### Hub Management Endpoints
**File:** `src/services/api.ts` - `HubApi`  
**Must Implement:**
- `POST /hub/pair`
  - **Payload:** `{ qrCode: string, homeId: string }`
  - **Response:** `{ hubId: string, status: string }`
  - **Used in:** `src/screens/HubPairScreen.tsx` (line ~80)
  - **Backend Requirements:**
    - Parse QR code (contains hub serial number)
    - Create hub record in database
    - Associate hub with home
    - Return hub ID and status

- `GET /homes/:homeId/hubs`
  - **Response:** `{ hubs: Hub[] }`
  - **Used in:** `src/hooks/useHubs.ts` (line ~25), `src/screens/DevicesScreen.tsx` (line ~38)
  - **Backend Requirements:**
    - Return all hubs for the home
    - Include hub status, name, type

- `POST /hubs/:hubId/wifi`
  - **Payload:** `{ ssid: string, password: string }`
  - **Used in:** `src/screens/HubSetupWizard.tsx` (Step 2, line ~150)
  - **Backend Requirements:**
    - Send WiFi credentials to hub via MQTT
    - Verify hub connects to WiFi
    - Return success/failure

- `POST /hubs/:hubId/rooms`
  - **Payload:** `{ roomIds: string[] }` (max 2 rooms)
  - **Used in:** `src/screens/HubSetupWizard.tsx` (Step 3, line ~220)
  - **Backend Requirements:**
    - Associate hub with rooms
    - Validate max 2 rooms per hub
    - Store in database

- `GET /hubs/:hubId/status`
  - **Response:** `{ status: string, connected: boolean }`
  - **Backend Requirements:**
    - Check hub connection status via MQTT
    - Return hub status

#### Device Management Endpoints
**File:** `src/services/api.ts` - `HubApi`  
**Must Implement:**
- `GET /homes/:homeId/devices`
  - **Response:** `{ devices: Device[] }`
  - **Used in:** `src/hooks/useHomeData.ts` (line ~31)
  - **Backend Requirements:**
    - Return all devices for the home
    - Include device state, room assignment, hub ID
    - Structure: `[{ id, name, type, category, isActive, value, roomId, hubId }]`

- `POST /homes/:homeId/devices`
  - **Payload:** `{ name, type, category, roomId, hubId, ... }`
  - **Used in:** `src/screens/DeviceOnboardingWizard.tsx` (Step 2, line ~129)
  - **Backend Requirements:**
    - Create device record in database
    - Associate with hub and room
    - Return device ID
    - **Response:** `{ id: string, deviceId: string }`

- `POST /hubs/:hubId/devices/:deviceId/learn`
  - **Payload:** `{ action: string }` (e.g., "ON", "OFF", "TEMP_UP")
  - **Used in:** `src/screens/DeviceOnboardingWizard.tsx` (Step 3, line ~160)
  - **Backend Requirements:**
    - Send "learn mode" command to hub via MQTT
    - Hub receives IR/RF signal from remote
    - Hub stores signal mapping for device action
    - Return success when signal learned

- `PUT /homes/:homeId/devices/:deviceId/control`
  - **Payload:** `{ isActive?: boolean, value?: number, ... }`
  - **Used in:** `src/hooks/useDeviceControl.ts` (line ~20)
  - **Backend Requirements:**
    - Send control command to hub via MQTT
    - Hub translates command to learned IR/RF signal
    - Hub sends signal to device
    - Hub reports state change back
    - Emit `device:update` event via WebSocket

- `GET /homes/:homeId/devices/:deviceId`
  - **Response:** `{ device: Device }`
  - **Backend Requirements:**
    - Return single device details

#### Home & Room Endpoints
**File:** `src/services/api.ts` - `HomeApi`  
**Must Implement:**
- `GET /homes/:homeId`
  - **Response:** `{ home: Home }` (includes `model3dUrl`)
  - **Used in:** `src/screens/DashboardScreen.tsx` (line ~66)
  - **Backend Requirements:**
    - Return home details including 3D model URL
    - Structure: `{ id, name, userId, model3dUrl, ... }`

- `GET /homes/:homeId/rooms`
  - **Response:** `{ rooms: Room[] }`
  - **Used in:** `src/hooks/useHomeData.ts` (line ~31)
  - **Backend Requirements:**
    - Return all rooms for the home
    - Include room stats (temperature, humidity, lights, power)
    - Structure: `[{ id, name, temperature, humidity, lights, power, scene, devices: [] }]`

- `GET /homes/:homeId/rooms/:roomId`
  - **Response:** `{ room: Room }`
  - **Used in:** `src/screens/RoomDetailScreen.tsx` (line ~50)
  - **Backend Requirements:**
    - Return single room with full details
    - Include all devices in room

- `PUT /homes/:homeId/layout`
  - **Payload:** `{ layout: { [roomId]: { x, y } } }`
  - **Used in:** `src/screens/DashboardScreen.tsx` (line ~103)
  - **Backend Requirements:**
    - Save room positions from 2D floor plan editor
    - Store in database (home.layout field)
    - Used when user drags rooms in edit mode

#### Energy Endpoints
**File:** `src/services/api.ts` - `HomeApi`  
**Must Implement:**
- `GET /homes/:homeId/energy?range=day|week|month`
  - **Response:** `{ energyData: EnergyData[] }`
  - **Used in:** `src/hooks/useEnergyData.ts` (line ~29)
  - **Backend Requirements:**
    - Return time-series energy data
    - Aggregate by time range
    - Structure: `[{ time, total, lighting, climate, media, security }]`
    - **Storage:** Use InfluxDB or similar time-series database

- `GET /homes/:homeId/rooms/:roomId/energy`
  - **Response:** `{ energyData: EnergyData[] }`
  - **Backend Requirements:**
    - Return energy data for a specific room

#### Scene Endpoints
**File:** `src/services/api.ts` - `ScenesApi`  
**Must Implement:**
- `GET /homes/:homeId/scenes`
  - **Response:** `{ scenes: Scene[] }`
  - **Used in:** `src/screens/ScenesScreen.tsx` (line ~105)
  - **Backend Requirements:**
    - Return all scenes for the home
    - Structure: `[{ id, name, icon, isActive, devices, description, deviceStates }]`

- `POST /homes/:homeId/scenes`
  - **Payload:** `{ name, icon, deviceStates: {}, devices: string[] }`
  - **Used in:** `src/screens/SceneFormScreen.tsx` (line ~185)
  - **Backend Requirements:**
    - Create scene in database
    - Store device states configuration

- `PUT /homes/:homeId/scenes/:sceneId`
  - **Payload:** `{ name, icon, deviceStates, devices }`
  - **Used in:** `src/screens/SceneFormScreen.tsx` (line ~189)
  - **Backend Requirements:**
    - Update scene configuration

- `DELETE /homes/:homeId/scenes/:sceneId`
  - **Used in:** `src/screens/SceneFormScreen.tsx` (line ~204), `src/screens/ScenesScreen.tsx` (line ~187)
  - **Backend Requirements:**
    - Delete scene from database

- `PUT /homes/:homeId/scenes/:sceneId/activate`
  - **Used in:** `src/screens/ScenesScreen.tsx` (line ~148)
  - **Backend Requirements:**
    - Apply all `deviceStates` to devices in scene
    - Deactivate previously active scene
    - Emit `device:update` events for each changed device
    - Mark scene as active in database

#### Schedule Endpoints
**File:** `src/services/api.ts` - `SchedulesApi`  
**Must Implement:**
- `GET /homes/:homeId/schedules`
  - **Response:** `{ schedules: Schedule[] }`
  - **Used in:** `src/screens/SchedulesScreen.tsx` (line ~20)
  - **Backend Requirements:**
    - Return all schedules for the home
    - Structure: `[{ id, name, time, days: string[], actions: [] }]`

- `POST /homes/:homeId/schedules`
  - **Payload:** `{ name, time, days, actions }`
  - **Used in:** `src/screens/SchedulesScreen.tsx` (line ~35)
  - **Backend Requirements:**
    - Create schedule in database
    - Schedule should be executable by scheduler service

- `PUT /homes/:homeId/schedules/:scheduleId`
  - **Payload:** `{ name, time, days, actions }`
  - **Used in:** `src/screens/SchedulesScreen.tsx` (future edit feature)
  - **Backend Requirements:**
    - Update schedule configuration

- `DELETE /homes/:homeId/schedules/:scheduleId`
  - **Used in:** `src/screens/SchedulesScreen.tsx` (line ~50)
  - **Backend Requirements:**
    - Delete schedule from database
    - Cancel scheduled execution

**Scheduler Service (Separate):**
- Must run scheduler service (cron, AWS EventBridge, Google Cloud Scheduler, etc.)
- Read schedules from database
- Execute actions at specified times
- Actions should trigger device controls or scene activations
- **Implementation:** Backend needs separate scheduler process

#### Multi-Home Endpoints
**File:** `src/services/api.ts` - `HomesApi`  
**Must Implement:**
- `GET /homes`
  - **Response:** `{ homes: Home[] }`
  - **Used in:** `src/screens/HomeSelectorScreen.tsx` (line ~20)
  - **Backend Requirements:**
    - Return all homes for the authenticated user
    - Structure: `[{ id, name, userId }]`

- `POST /homes`
  - **Payload:** `{ name: string }`
  - **Used in:** `src/screens/HomeSelectorScreen.tsx` (line ~35)
  - **Backend Requirements:**
    - Create new home for user
    - Return home ID

**Optional Enhancement:**
- Include `homes` array in `/auth/me` response
- Used in: `src/context/AuthContext.tsx` (line ~59, 71)

#### Device Groups Endpoints
**File:** `src/services/api.ts` - `DeviceGroupsApi`  
**Must Implement:**
- `GET /homes/:homeId/device-groups`
  - **Response:** `{ groups: DeviceGroup[] }`
  - **Used in:** `src/screens/DeviceGroupsScreen.tsx` (line ~20)
  - **Backend Requirements:**
    - Return all device groups for the home
    - Structure: `[{ id, name, deviceIds: string[] }]`

- `POST /homes/:homeId/device-groups`
  - **Payload:** `{ name, deviceIds: string[] }`
  - **Used in:** `src/screens/DeviceGroupsScreen.tsx` (line ~35)
  - **Backend Requirements:**
    - Create device group
    - Associate devices with group

- `PUT /homes/:homeId/device-groups/:groupId`
  - **Payload:** `{ name, deviceIds }`
  - **Backend Requirements:**
    - Update group configuration

- `DELETE /homes/:homeId/device-groups/:groupId`
  - **Used in:** `src/screens/DeviceGroupsScreen.tsx` (line ~50)
  - **Backend Requirements:**
    - Delete device group

**Future Enhancement:**
- Add group control endpoint: `POST /homes/:homeId/device-groups/:groupId/control`
- Apply control command to all devices in group

#### Automation Endpoints
**File:** `src/services/api.ts` - `AutomationsApi`  
**Must Implement:**
- `GET /homes/:homeId/automations`
  - **Response:** `{ automations: Automation[] }`
  - **Used in:** `src/screens/AutomationsScreen.tsx` (line ~20)
  - **Backend Requirements:**
    - Return all automations for the home
    - Structure: `[{ id, name, trigger: { type, at, condition }, actions: [] }]`

- `POST /homes/:homeId/automations`
  - **Payload:** `{ name, trigger: { type: 'time'|'sensor'|'device', at?, condition? }, actions: [] }`
  - **Used in:** `src/screens/AutomationsScreen.tsx` (line ~35)
  - **Backend Requirements:**
    - Create automation rule
    - Store trigger conditions and actions

- `PUT /homes/:homeId/automations/:automationId`
  - **Payload:** `{ name, trigger, actions }`
  - **Backend Requirements:**
    - Update automation configuration

- `DELETE /homes/:homeId/automations/:automationId`
  - **Used in:** `src/screens/AutomationsScreen.tsx` (line ~50)
  - **Backend Requirements:**
    - Delete automation

**Automation Engine (Separate):**
- Must run automation engine service
- Evaluate triggers (time, sensor values, device states)
- Execute actions when triggers fire
- Actions should trigger device controls or scene activations
- **Implementation:** Backend needs separate automation engine process

#### Device History Endpoints
**File:** `src/services/api.ts` - `DeviceHistoryApi`  
**Must Implement:**
- `GET /homes/:homeId/devices/:deviceId/history?range=day|week|month`
  - **Response:** `{ history: HistoryEvent[] }`
  - **Used in:** `src/screens/DeviceHistoryScreen.tsx` (line ~20)
  - **Backend Requirements:**
    - Return device state change history
    - Structure: `[{ timestamp, event, state, value? }]`
    - **Storage:** Use InfluxDB or time-series database
    - Aggregate by time range

### 2. WebSocket/MQTT Real-time Server

**Status:** Frontend ready, backend server needed

**Location:** Your backend server (Node.js with Socket.IO, MQTT broker, etc.)

**File:** `src/services/realtime.ts`

**Must Implement:**
- WebSocket server (Socket.IO compatible)
  - Connect URL: `ws://{apiBaseUrl}` or `wss://{apiBaseUrl}`
  - Auth: Validate token in connection handshake
  - Query: `?homeId={homeId}` for subscription
  - Transport: WebSocket only

- Event Emission:
  - `device:update` - Emit when device state changes
    - **Payload:** `{ deviceId: string, state: any }`
    - **Used in:** All screens with `useRealtime` hook
    - **Trigger:** When device control command completes

  - `energy:update` - Emit when energy data updates
    - **Payload:** `{ homeId: string, energyData: EnergyData }`
    - **Used in:** `src/screens/EnergyScreen.tsx`, `src/screens/DashboardScreen.tsx`
    - **Trigger:** Periodically or when energy reading changes

  - `hub:status` - Emit when hub status changes
    - **Payload:** `{ hubId: string, status: string }`
    - **Trigger:** When hub connects/disconnects

**Implementation Pattern:**
1. Hub communicates via MQTT
2. Backend subscribes to MQTT topics
3. Backend bridges MQTT to WebSocket
4. Backend emits WebSocket events to connected clients based on `homeId`

### 3. Push Notification Backend Integration

**Status:** Frontend registration ready, backend delivery needed

**Files:** 
- `src/services/notifications.ts` (registration)
- `App.tsx` (calls registration on startup)

**Must Implement:**
- Store push tokens in backend database
  - **Endpoint:** `PUT /users/me/push-token` (add this to `AuthApi`)
  - **Used in:** Modify `src/services/notifications.ts` to send token to backend
  - **Backend Requirements:**
    - Store Expo push token per user/device
    - Update token when app starts

- Send push notifications via Expo Push API
  - **Backend Requirements:**
    - Integrate with Expo Push Notification Service
    - Send notifications on events (device state change, energy alerts, etc.)
    - Handle delivery failures gracefully

**Where to Implement:**
- **File:** `src/services/notifications.ts` (line ~15)
  - Add code after getting token:
  ```typescript
  if (token) {
    // Send token to backend
    const client = getApiClient(async () => await AsyncStorage.getItem('auth_token'));
    await AuthApi(client).updatePushToken(token);
  }
  ```

- **File:** `src/services/api.ts` - `AuthApi`
  - Add: `updatePushToken: (token: string) => client.put('/users/me/push-token', { token })`

### 4. App Store Configuration

**Status:** Basic config exists, needs production updates

**File:** `app.json`

**Must Update:**
- `extra.apiBaseUrl`: Change from `"https://YOUR_API_BASE_URL"` to actual production URL
- `extra.appsyncEndpoint`: Update if using AWS AppSync
- `extra.cognitoUserPoolId`: Update if using AWS Cognito
- `extra.cognitoClientId`: Update if using AWS Cognito
- Remove `demoUserEnabled` or set to `false` for production

**iOS Build:**
- Configure EAS Build for iOS
- Set up Apple Developer account
- Configure certificates and provisioning profiles
- **Command:** `eas build --platform ios`

**Android Build:**
- Configure EAS Build for Android
- Set up Google Play Developer account
- Generate signing key
- **Command:** `eas build --platform android`

## 🟡 IMPORTANT - Should Implement Before Launch

### 5. Offline Action Queueing

**Status:** Read caching ✅ | Write queueing ❌

**Files:** 
- `src/services/api.ts`
- `src/hooks/useDeviceControl.ts`

**Must Implement:**
- Queue device control actions when offline
- Queue scene activations when offline
- Sync queued actions when back online
- Show pending actions indicator in UI

**Where to Implement:**
- **New File:** `src/services/offlineQueue.ts`
  - Queue structure: `{ type: 'device-control'|'scene-activate', payload: any, timestamp: number }`
  - Store in AsyncStorage: `offline_queue`
  - Sync when network available

- **Modify:** `src/hooks/useDeviceControl.ts` (line ~20)
  - Check network status before calling API
  - If offline, add to queue
  - If online, call API and clear queue

- **Modify:** `src/screens/ScenesScreen.tsx` (line ~148)
  - Check network before activating scene
  - Queue scene activation if offline

- **Add:** Queue sync on app startup
  - **File:** `App.tsx` or `src/context/AuthContext.tsx`
  - Check for queued actions
  - Sync with backend when network available

### 6. Error Handling Improvements

**Status:** Basic error states ✅ | User-friendly messages ⚠️ | Retry logic ❌

**Files:** Multiple screens

**Must Implement:**
- Global error banner component
  - **New File:** `src/components/ErrorBanner.tsx`
  - Display errors at top of screen
  - Retry button for failed requests
  - Dismissible

- Add retry logic to hooks
  - **Modify:** `src/hooks/useHomeData.ts` (line ~50)
    - Add retry count and retry function
    - Retry on network errors
  
  - **Modify:** `src/hooks/useEnergyData.ts` (line ~43)
    - Add retry logic for failed requests

- Network error detection
  - **Modify:** All API calls
  - Detect network failures specifically
  - Show "Network error" vs "Server error"

- Error boundary for React errors
  - **New File:** `src/components/ErrorBoundary.tsx`
  - Wrap app in error boundary
  - **Modify:** `App.tsx` to include error boundary

### 7. Push Notification Handlers

**Status:** Registration ✅ | Handlers ❌

**Files:** 
- `App.tsx`
- `src/services/notifications.ts`

**Must Implement:**
- Foreground notification handler
  - **Modify:** `App.tsx` (after line ~8)
  - Handle notifications when app is open
  - Display in-app notification banner

- Background notification handler
  - **Modify:** `App.tsx`
  - Handle notifications when app is in background
  - Navigate to relevant screen on tap

- Notification actions (optional)
  - Quick actions from notifications (e.g., "Turn on lights")

**Where to Implement:**
- **File:** `App.tsx` (add after line ~8):
```typescript
useEffect(() => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    // Handle foreground notification
  });
  
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    // Handle notification tap
    // Navigate to relevant screen
  });
  
  return () => {
    subscription.remove();
    responseSubscription.remove();
  };
}, []);
```

### 8. Settings Screen Enhancements

**Status:** Basic UI ✅ | Functionality ❌

**File:** `src/screens/SettingsScreen.tsx`

**Must Implement:**
- Home selector link
  - **Line ~100:** Add navigation to `HomeSelector` screen
  - **Code:**
  ```typescript
  <TouchableOpacity 
    style={styles.settingItem} 
    onPress={() => navigation.navigate('HomeSelector')}
  >
    <Text style={styles.settingLabel}>Select Home</Text>
  </TouchableOpacity>
  ```

- Device Groups link
  - **Add:** Navigation to `DeviceGroups` screen

- Automations link
  - **Add:** Navigation to `Automations` screen

- Schedules link
  - **Add:** Navigation to `Schedules` screen

- Profile navigation
  - **Line ~78:** Make profile card navigate to `Profile` screen

- Settings persistence
  - **Add:** Save preferences to AsyncStorage
  - Load preferences on mount
  - Sync preferences with backend (optional)

### 9. Device History Navigation

**Status:** Screen exists ✅ | Navigation missing ❌

**Files:** 
- `src/components/DeviceTile.tsx`
- `src/screens/DevicesScreen.tsx`

**Must Implement:**
- Add "View History" button/long-press on device tiles
- Navigate to `DeviceHistory` screen with `deviceId`
- **Modify:** `src/components/DeviceTile.tsx`
  - Add long-press handler
  - Show action sheet with "View History" option

- **Modify:** `src/screens/DevicesScreen.tsx`
  - Add navigation to history on long-press

### 10. Type Safety - Navigation Parameters

**Status:** Partially typed ✅ | Missing types ⚠️

**File:** `src/types/index.ts`

**Must Update:**
- Add missing navigation routes:
```typescript
export type RootStackParamList = {
  // ... existing routes
  HomeSelector: undefined;
  DeviceGroups: undefined;
  Automations: undefined;
  DeviceHistory: { deviceId: string };
  Schedules: undefined;
};
```

## 🟢 NICE TO HAVE - Enhancements (Post-Launch)

### 11. Room Layout Editor - Resize/Rotate

**Status:** Drag reposition ✅ | Resize/Rotate ❌

**File:** `src/components/InteractiveFloorPlan.tsx`

**Enhancements:**
- Add resize handles to rooms in edit mode
- Add rotation controls
- Undo/redo functionality
- Snap-to-grid option

**Implementation:**
- Add resize handles to SVG paths (corners)
- Add rotation handle (rotate icon)
- Store resize/rotation in `roomPositions` state
- Save via `onLayoutUpdate` callback

### 12. 3D Floor Plan Enhancements

**Status:** Basic WebView ✅ | Enhancements ❌

**File:** `src/screens/DashboardScreen.tsx` (line ~145)

**Enhancements:**
- Better loading states (show spinner while loading)
- Error handling if 3D model fails to load
- Ability to add/edit 3D model URL
- Interactive controls for 3D model (zoom, pan, rotate)

**Implementation:**
- Add loading state for WebView
- Add error handler for WebView `onError`
- Create settings screen for 3D model URL
- Add controls overlay for 3D model

### 13. Device Groups - Control Functionality

**Status:** CRUD ✅ | Control ❌

**File:** `src/screens/DeviceGroupsScreen.tsx`

**Enhancements:**
- Control all devices in group together
- Group toggle button (turn all on/off)
- Group value setting (e.g., set all lights to 50%)

**Implementation:**
- Add control buttons to group cards
- Create `useGroupControl` hook
- Call device control API for each device in group

### 14. Automation Rule Builder

**Status:** Basic UI ✅ | Advanced Builder ❌

**File:** `src/screens/AutomationsScreen.tsx`

**Enhancements:**
- Visual rule builder (If/Then blocks)
- Multiple trigger types (time, sensor, device state)
- Multiple action types
- Rule testing/preview

**Implementation:**
- Create `AutomationFormScreen.tsx`
- Build visual builder component
- Support complex trigger conditions
- Support multiple actions

### 15. Device History Charts

**Status:** List view ✅ | Charts ❌

**File:** `src/screens/DeviceHistoryScreen.tsx`

**Enhancements:**
- Chart visualization of device usage over time
- Statistics (total usage, average, peaks)
- Filter by time range

**Implementation:**
- Use `react-native-chart-kit` for charts
- Aggregate history data by time ranges
- Add statistics calculations

## 📋 Pre-Deployment Checklist

### Code Readiness
- [ ] All API endpoints implemented on backend
- [ ] WebSocket server running and emitting events
- [ ] Push notification backend integration complete
- [ ] Error handling tested (network failures, invalid tokens)
- [ ] Offline mode tested (turn off network, verify cache)
- [ ] Real-time updates tested (device changes reflect immediately)
- [ ] Multi-home switching tested
- [ ] Device onboarding flow tested end-to-end
- [ ] Scene activation tested with multiple devices
- [ ] Floor plan editing tested (drag and save)
- [ ] 3D model loading tested with various URLs

### Configuration
- [ ] `app.json` updated with production API URL
- [ ] `app.json` updated with production Cognito/AppSync config (if used)
- [ ] `demoUserEnabled` set to `false` or removed
- [ ] Push notification credentials configured
- [ ] EAS Build configured for iOS and Android
- [ ] Apple Developer account set up
- [ ] Google Play Developer account set up

### App Store Requirements
- [ ] App icons configured (`assets/icon.png`, `assets/adaptive-icon.png`)
- [ ] Splash screen configured (`assets/splash-icon.png`)
- [ ] App name and description ready
- [ ] Privacy policy URL ready
- [ ] Terms of service URL ready
- [ ] Support email configured
- [ ] App screenshots prepared (iOS and Android)
- [ ] App Store listing copy written

### Security
- [ ] API uses HTTPS/WSS only
- [ ] JWT tokens have expiration
- [ ] Token refresh mechanism (if needed)
- [ ] Password hashing on backend (bcrypt, argon2)
- [ ] Input validation on backend
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Rate limiting on API endpoints

### Performance
- [ ] Image optimization (assets compressed)
- [ ] Bundle size optimized
- [ ] App startup time acceptable (< 3 seconds)
- [ ] Memory leaks checked
- [ ] Battery usage reasonable

### Testing
- [ ] Tested on iOS device (physical device, not simulator)
- [ ] Tested on Android device (physical device, not emulator)
- [ ] Tested with multiple users
- [ ] Tested with multiple homes per user
- [ ] Tested device onboarding with real hub
- [ ] Tested signal learning with real remote
- [ ] Tested offline mode extensively
- [ ] Tested real-time updates with multiple devices
- [ ] Performance testing under load

## 🔧 Where to Implement - File Reference

### Backend API Endpoints
**Location:** Your backend server codebase

All endpoints referenced in `src/services/api.ts`:
- Lines 32-36: `AuthApi`
- Lines 39-52: `HubApi`
- Lines 55-65: `HomeApi`
- Lines 68-74: `ScenesApi`
- Lines 77-82: `SchedulesApi`
- Lines 85-88: `HomesApi`
- Lines 91-96: `DeviceGroupsApi`
- Lines 99-104: `AutomationsApi`
- Lines 107-109: `DeviceHistoryApi`

### Frontend Enhancements

**Offline Queue:**
- **New File:** `src/services/offlineQueue.ts`
- **Modify:** `src/hooks/useDeviceControl.ts` (line ~20)
- **Modify:** `src/screens/ScenesScreen.tsx` (line ~148)

**Error Handling:**
- **New File:** `src/components/ErrorBanner.tsx`
- **New File:** `src/components/ErrorBoundary.tsx`
- **Modify:** `App.tsx` (wrap with ErrorBoundary)

**Push Notifications:**
- **Modify:** `src/services/notifications.ts` (line ~15)
- **Modify:** `src/services/api.ts` - Add `updatePushToken` to `AuthApi`
- **Modify:** `App.tsx` (add notification handlers)

**Settings:**
- **Modify:** `src/screens/SettingsScreen.tsx` (add navigation links)

**Device History:**
- **Modify:** `src/components/DeviceTile.tsx` (add long-press)
- **Modify:** `src/screens/DevicesScreen.tsx` (add navigation)

**Navigation Types:**
- **Modify:** `src/types/index.ts` (add missing routes)

## 📝 Priority Order for Implementation

1. 🔴 **Backend API Server** - All endpoints (critical, app won't work without)
2. 🔴 **WebSocket Server** - Real-time updates (critical for user experience)
3. 🔴 **App Store Configuration** - Production URLs, build config
4. 🟡 **Offline Action Queueing** - Better offline UX
5. 🟡 **Error Handling Improvements** - User-friendly errors
6. 🟡 **Push Notification Backend** - Complete notification delivery
7. 🟡 **Settings Screen Links** - Complete navigation
8. 🟢 **Feature Enhancements** - Post-launch improvements

---

**Note:** The frontend is 100% ready for all backend endpoints. Once you implement the backend API server and WebSocket server, the app will be fully functional. All other items are enhancements for better UX and production readiness.

