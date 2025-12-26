# VeaHome Deployment Architecture

## Current Setup (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR DEVELOPMENT                         │
│  ┌──────────────┐                                           │
│  │   Your PC    │                                           │
│  │              │                                           │
│  │  1. Write code                                           │
│  │  2. Run: npm run update:dev                             │
│  │  3. Done! ✨                                             │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ (git push + eas update)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPO (EAS) CLOUD                          │
│                                                              │
│  ┌──────────────────────────────────────────┐              │
│  │  EAS Build Servers                       │              │
│  │  • Build Android APK (once)              │              │
│  │  • Takes ~20 minutes                     │              │
│  │  • Generates download link               │              │
│  └──────────────────────────────────────────┘              │
│                                                              │
│  ┌──────────────────────────────────────────┐              │
│  │  EAS Update CDN                          │              │
│  │  • Instant OTA updates                   │              │
│  │  • No rebuild needed                     │              │
│  │  • Versioning & Rollback                 │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ (APK download + updates)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    USER DEVICES                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Phone 1    │  │   Phone 2    │  │   Phone 3    │     │
│  │              │  │              │  │              │     │
│  │  VeaHome APK │  │  VeaHome APK │  │  VeaHome APK │     │
│  │              │  │              │  │              │     │
│  │  Auto-updates│  │  Auto-updates│  │  Auto-updates│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                 │
│                            │ (API calls)                     │
│                            ▼                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    AWS EC2 (Your Backend)                    │
│                                                              │
│  IP: 63.34.243.171:8000                                     │
│                                                              │
│  ┌──────────────────────────────────────────┐              │
│  │  VeaHome Backend API                     │              │
│  │  • Node.js / Express                     │              │
│  │  • PostgreSQL                            │              │
│  │  • InfluxDB                              │              │
│  │  • Socket.IO                             │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## Workflow Comparison

### ❌ Old Way (What you wanted to avoid)
```
1. Your PC must stay running
2. Run expo start
3. Users connect to your PC
4. Any change = restart server
5. Users must be on same network
6. PC offline = App offline
```

### ✅ New Way (EAS Solution)
```
1. Build APK once (20 min, one-time)
2. Users install APK
3. You make changes
4. Run: npm run update:dev (30 sec)
5. Users auto-receive updates
6. Works from anywhere, anytime
7. Your PC can be off!
```

## Update Flow

```
Developer                    EAS Cloud                  User Devices
    │                            │                           │
    │  1. Code changes          │                           │
    │─────────────────────────>│                           │
    │  eas update               │                           │
    │                           │                           │
    │  2. Process & Host        │                           │
    │<───────────────────────── │                           │
    │  Update published!        │                           │
    │                           │                           │
    │                           │  3. Check for updates    │
    │                           │<──────────────────────────│
    │                           │     (on app open)        │
    │                           │                           │
    │                           │  4. Download update      │
    │                           │───────────────────────────>│
    │                           │     (JS bundle)          │
    │                           │                           │
    │                           │  5. Apply & reload       │
    │                           │<──────────────────────────│
    │                           │     (automatic)          │
```

## Two Types of Updates

### Native Updates (Rare - Need rebuild)
- Changed native dependencies
- Updated permissions
- Modified native code
- Upgraded Expo SDK

**Process:** `npm run build:dev` → Wait 20 min → Redistribute APK

### JavaScript Updates (Daily - Instant)
- UI changes
- Business logic
- API endpoints
- Bug fixes
- New features (JS only)

**Process:** `npm run update:dev` → Wait 30 sec → Users auto-receive

## Cost Breakdown

### Option 1: EAS (Recommended) ✅
```
EAS Free Tier:           $0/month
- 10 builds/month        Free
- Unlimited updates      Free
- 5 team members         Free

Backend on AWS:          ~$30/month
- t3.small EC2          $15
- Data transfer         $10
- Database              $5

TOTAL: ~$30/month
```

### Option 2: Self-Hosted Everything
```
EC2 (t3.medium):        $30/month
- Expo dev server
- Backend
- Database

EC2 (for builds):       $50/month
- Build machine

EBS Storage:            $10/month
Data Transfer:          $20/month

TOTAL: ~$110/month + maintenance time
```

## Comparison Table

| Feature | EAS (Recommended) | Self-Hosted |
|---------|-------------------|-------------|
| Setup Time | 30 minutes | 4-6 hours |
| Monthly Cost | $0-30 | $110+ |
| Maintenance | None | Weekly |
| Update Speed | <1 min | Varies |
| Reliability | 99.9% SLA | Your responsibility |
| CDN | Global | None |
| Build Speed | Fast | Depends on instance |
| Team Access | Easy | Complex |
| Rollback | 1-click | Manual |

## Security Flow

```
┌──────────────────────────────────────────────────────────┐
│  User's Phone                                            │
│                                                          │
│  ┌────────────────────────┐                            │
│  │  VeaHome App           │                            │
│  │  • JWT Token           │                            │
│  │  • Secure Storage      │                            │
│  └────────────────────────┘                            │
│            │                                             │
│            │ HTTPS                                       │
│            ▼                                             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  AWS Backend (Your Server)                               │
│                                                          │
│  ┌────────────────────────┐                            │
│  │  Security Group        │                            │
│  │  • Port 8000 open      │                            │
│  │  • CORS configured     │                            │
│  └────────────────────────┘                            │
│                                                          │
│  ┌────────────────────────┐                            │
│  │  API Server            │                            │
│  │  • JWT validation      │                            │
│  │  • Rate limiting       │                            │
│  └────────────────────────┘                            │
└──────────────────────────────────────────────────────────┘
```

## Branch Strategy

```
Git Repository
│
├── main (Production)
│   └─> eas update --branch production
│       └─> Users with production builds get updates
│
└── development (Testing)
    └─> eas update --branch development
        └─> Users with dev builds get updates
```

## Recommended Setup for Your Team

```
Team Member Roles:
├── Developers (3-5 people)
│   └─> Install development build
│       └─> Get instant updates on every push
│
├── QA Testers (2-3 people)
│   └─> Install preview build
│       └─> Test before production release
│
└── End Users
    └─> Install production build
        └─> Get stable, tested updates
```

## Summary: Why This Works Perfectly for You

✅ **No PC needed** - EAS hosts everything
✅ **Instant updates** - Changes live in seconds
✅ **Works anywhere** - Team tests from any location
✅ **Auto-deployment** - Push to git, auto-update
✅ **Cost-effective** - Free tier covers most needs
✅ **Professional** - Same system used by major apps
✅ **Easy rollback** - Undo bad updates instantly
✅ **Backend on AWS** - Full control where you need it

**Your backend stays on AWS (full control), while EAS handles the complex app distribution and updates (zero hassle).**
