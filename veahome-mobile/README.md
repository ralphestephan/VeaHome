# VeaHome Mobile App

A comprehensive React Native (Expo) smart home control application for managing IoT devices through a central hub. Controls IR devices (TVs, ACs), RF devices (blinds, shutters), relays (lights, locks), and monitors energy consumption and air quality.

## 📱 Features

### Core Features
- **Interactive Floor Plan**: Clickable room map for quick navigation
- **Device Control**: Manage lights, thermostats, TVs, ACs, blinds, shutters, locks, and cameras
- **Energy Monitoring**: Real-time energy consumption tracking with charts
- **Air Quality Sensors**: Monitor CO2, VOC, PM2.5, and PM10 levels
- **Scene Management**: Create and activate custom scenes
- **Automation**: Set up rules and schedules
- **Profile & Settings**: Manage user preferences and home configuration

### Device Categories
- **IR Devices**: TVs, Air Conditioners
- **RF Devices**: Window blinds, Shutters
- **Relay Devices**: Lights, Door locks
- **Sensors**: Air quality, Rain, Motion, Door/Window, Smoke

## 🛠 Tech Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation (Stack & Bottom Tabs)
- **UI Components**: React Native Paper
- **Charts**: Victory Native
- **Icons**: MaterialCommunityIcons
- **State Management**: React Context (expandable to Redux)
- **Backend**: AWS (Cognito, AppSync, Lambda, DynamoDB, IoT Core)

## 📂 Project Structure

```
veahome-mobile/
├── src/
│   ├── assets/          # Images and static assets
│   ├── components/      # Reusable components
│   │   ├── Header.tsx
│   │   ├── DeviceTile.tsx
│   │   └── RoomCard.tsx
│   ├── constants/       # Constants and mock data
│   │   ├── theme.ts
│   │   └── mockData.ts
│   ├── navigation/      # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/         # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── DevicesScreen.tsx
│   │   ├── EnergyScreen.tsx
│   │   ├── ScenesScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── RoomDetailScreen.tsx
│   │   └── ThermostatScreen.tsx
│   ├── services/        # API services (AWS integration)
│   ├── types/           # TypeScript types
│   └── hooks/           # Custom React hooks
├── App.tsx              # Main app entry point
├── app.json             # Expo configuration
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
└── babel.config.js      # Babel configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for Android emulator)
- Expo Go app on physical device (optional)

### Installation

1. **Navigate to the mobile app directory:**
   ```bash
   cd veahome-mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on device/simulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# AWS Configuration (Backend)
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=your_user_pool_id
AWS_COGNITO_CLIENT_ID=your_client_id
AWS_APPSYNC_ENDPOINT=https://your-api.appsync-api.us-east-1.amazonaws.com/graphql
AWS_APPSYNC_REGION=us-east-1
```

### Theme Customization

Edit `src/constants/theme.ts` to customize colors, spacing, and typography:

```typescript
export const colors = {
  primary: '#5b7cff',
  secondary: '#1e2139',
  background: '#13152a',
  // ... more colors
};
```

## 📱 Screens Overview

### 1. Home Screen
- Welcome screen with "Connect Home" button
- VeaLive branding

### 2. Dashboard
- Quick stats (devices, energy, temperature)
- Room cards with live data
- Quick actions (lights, locks, cameras, music)

### 3. Devices Screen
- Categorized device view (Lights, Climate, Windows, Media, Security)
- Device tiles with on/off toggle
- Real-time device states

### 4. Energy Screen
- Total energy consumption display
- Time range selector (Day/Week/Month)
- Category breakdown charts
- Cost estimation
- Energy insights

### 5. Scenes Screen
- Active scenes display
- Scene activation/deactivation
- Custom scene creation

### 6. Settings Screen
- Home information
- Network settings
- Preferences (notifications, dark mode, energy saving)
- Data & storage
- Security & privacy
- Support options

### 7. Profile Screen
- User information
- Quick stats
- Contact information
- Most used devices
- Achievements
- Recent activity

### 8. Room Detail Screen
- Room-specific device control
- Climate information
- Scene management
- Quick controls

### 9. Thermostat Screen
- Temperature control dial
- Mode selection (Cool/Heat/Auto)
- Current status display
- Fan control

## 🔌 Backend Integration

### AWS Services Setup

See `/AWS_BACKEND_ARCHITECTURE.md` for complete backend setup instructions.

### Key Integration Points

1. **Authentication**: AWS Cognito
2. **API**: AWS AppSync (GraphQL)
3. **Database**: DynamoDB
4. **Device Communication**: AWS IoT Core
5. **Functions**: AWS Lambda

### API Service Structure (To Implement)

```typescript
// src/services/api.ts
import { AWSAppSyncClient } from 'aws-appsync';

const client = new AWSAppSyncClient({
  url: process.env.AWS_APPSYNC_ENDPOINT,
  region: process.env.AWS_REGION,
  auth: {
    type: 'AMAZON_COGNITO_USER_POOLS',
    jwtToken: async () => getJwtToken(),
  },
});

export const getDevices = async (roomId: string) => {
  const query = gql`
    query GetDevices($roomId: ID!) {
      listDevicesByRoom(roomId: $roomId) {
        deviceId
        name
        type
        isActive
        state
      }
    }
  `;
  return client.query({ query, variables: { roomId } });
};
```

## 🧪 Testing

### Running Tests

```bash
npm test
```

### Testing Checklist

- [ ] All screens navigate correctly
- [ ] Device controls respond properly
- [ ] Energy charts display data
- [ ] Scenes activate successfully
- [ ] Settings save correctly
- [ ] Profile updates work
- [ ] Mock data loads properly

## 📦 Building for Production

### iOS Build

```bash
expo build:ios
```

### Android Build

```bash
expo build:android
```

### Over-the-Air (OTA) Updates

```bash
expo publish
```

## 🎨 UI/UX Design

The app follows the exact Figma design specifications:

- **Color Scheme**: Dark theme with primary blue (#5b7cff)
- **Typography**: System default with weight variations
- **Spacing**: Consistent 8px grid system
- **Border Radius**: Rounded corners (12-32px)
- **Icons**: MaterialCommunityIcons throughout
- **Animations**: Smooth transitions and hover effects

## 🔐 Security

- All API calls authenticated via Cognito
- Device commands encrypted in transit
- User data stored securely in DynamoDB
- IoT communication via TLS
- No hardcoded credentials

## 📊 Mock Data

Currently using mock data in `src/constants/mockData.ts` for:
- Rooms
- Devices
- Energy data
- Scenes
- Sensors

**To connect real backend**: Replace mock data imports with API service calls.

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler fails to start**
   ```bash
   expo start -c
   ```

2. **Dependencies not resolving**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **iOS simulator not opening**
   - Ensure Xcode is installed
   - Run `xcode-select --install`

4. **Android emulator issues**
   - Check Android Studio AVD Manager
   - Ensure Android SDK is properly configured

## 🔄 Migration from Web to Mobile

The app was migrated from the original React web version:

### Key Changes
- Replaced HTML elements with React Native components
- Changed CSS to StyleSheet API
- Replaced Recharts with Victory Native
- Updated navigation from React Router to React Navigation
- Adapted touch interactions for mobile

### Component Mapping
- `<div>` → `<View>`
- `<p>`, `<span>` → `<Text>`
- `<button>` → `<TouchableOpacity>`
- `<img>` → `<Image>`
- CSS → `StyleSheet.create()`

## 📝 TODO

- [ ] Integrate AWS Amplify
- [ ] Implement real-time subscriptions
- [ ] Add biometric authentication
- [ ] Implement push notifications
- [ ] Add offline mode support
- [ ] Create onboarding flow
- [ ] Add device pairing wizard
- [ ] Implement data caching
- [ ] Add unit tests
- [ ] Add E2E tests with Detox

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Copyright © 2025 VeaLive. All rights reserved.

## 📞 Support

For support or questions:
- Email: support@vealive.com
- Documentation: See AWS_BACKEND_ARCHITECTURE.md
- Issues: Open a GitHub issue

---

**Note**: This app is currently in development. The backend AWS infrastructure needs to be deployed separately following the instructions in `AWS_BACKEND_ARCHITECTURE.md`.
