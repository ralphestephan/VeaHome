# VeaHome Developer Guide

The goal of this README is to be exhaustive. Every folder and file is called out, the API naming conventions are explained, the database schema is documented, and the full environment/bootstrap story (including AWS IoT credentials) lives here. Treat it as the canonical handbook when onboarding someone new or when you come back after a long break.

## Table of Contents

1. [Project at a Glance](#project-at-a-glance)
2. [Quick Start](#quick-start)
3. [Environment & Secrets](#environment--secrets)
4. [Database Schema & Migrations](#database-schema--migrations)
5. [Repository Atlas](#repository-atlas)
6. [API Endpoint Reference & Naming](#api-endpoint-reference--naming)
7. [Modifying or Extending the System](#modifying-or-extending-the-system)
8. [MQTT, Node-RED & Telemetry](#mqtt-node-red--telemetry)
9. [Operational Playbook](#operational-playbook)

---

## Project at a Glance

- **Frontend (Expo / React Native):** Cross-platform client that handles authentication, dashboards, floor plans, device control, energy analytics, automations, schedules, onboarding flows, and VR/3D previews.
- **Backend (Express + TypeScript + PostgreSQL):** REST API with repositories, services for MQTT/AWS IoT/Node-RED/InfluxDB, Joi validation middleware, and SQL migrations. Acts as the single source of truth for homes, rooms, hubs, devices, automations, schedules, scenes, and telemetry.

---

## Quick Start

1. **Prerequisites**
  - Node.js 18+
  - npm 9+
  - PostgreSQL 14+
  - (Optional) InfluxDB or AWS Timestream if you plan to persist time-series data immediately.
2. **Install dependencies**
  ```powershell
  cd "c:\Users\Hello\OneDrive - Université Saint-Esprit de Kaslik\Desktop\Projects\Vealive\VeaHome\VeaHome"
  npm install
  cd backend
  npm install
  ```
3. **Environment setup** – copy `backend/.env.example` to `backend/.env` and fill values (see [Environment & Secrets](#environment--secrets)).
4. **Build + migrate backend**
  ```powershell
  cd backend
  npm run build
  npm run migrate   # runs dist/database/migrate.js → applies SQL in chronological order
  ```
5. **(Optional) Seed demo data**
  ```powershell
  npm run build
  node dist/database/seed.js   # uses database/seed.sql
  ```
6. **Run services**
  - Backend API: `cd backend; npm run dev`
  - Expo client: `npm start` (from repo root, choose platform when Metro starts)
7. **Smoke test**
  ```powershell
  curl http://localhost:8000/health
  ```

---

## Environment & Secrets

The backend reads configuration from `backend/.env`. Keys are grouped below; the example file ships with placeholder values and should never be committed once populated.

| Group | Variables | Used By |
| --- | --- | --- |
| Server | `PORT`, `NODE_ENV`, `WEBSOCKET_PORT` | `backend/src/server.ts`, `backend/src/services/websocket.service.ts` |
| PostgreSQL | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `backend/src/config/database.ts`, `database/migrate.ts` |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN` | `backend/src/config/jwt.ts`, `auth.controller.ts` |
| AWS IoT | `AWS_REGION`, `AWS_IOT_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `backend/src/services/iot.service.ts`, `mqttService.ts` |
| Time-series | `INFLUXDB_URL`, `INFLUXDB_TOKEN`, `INFLUXDB_ORG`, `INFLUXDB_BUCKET`, `TIMESTREAM_DATABASE`, `TIMESTREAM_TABLE` | `influxService.ts`, `telemetryService.ts` |

> `.env` lives beside `backend/package.json`. Use AWS IAM users with scoped policies for MQTT/Timestream, never root credentials.

Frontend-specific secrets (if needed for OTA or 3D assets) can be added to an Expo app config via `app.config.js` or runtime envs, but at the moment the client relies on the backend for all sensitive work.

---

## Database Schema & Migrations

Migrations live in `backend/database/migrations` and run in lexicographical order via `database/migrate.ts`. Each file is self-describing:

| Migration | Purpose |
| --- | --- |
| `001_initial_schema.sql` | Creates base tables: `users`, `homes`, `rooms`, `hubs`, `hub_rooms`, `devices`, `scenes`, `schedules`, `device_groups`, `automations`, plus indexes and a `schema_migrations` ledger. |
| `002_rooms_layout.sql` | Adds optional layout path, accent color, and metadata JSON blobs to `rooms`. |
| `003_hubs_metadata.sql` | Extends `hubs` with provisioning metadata, owner pointer, firmware version, encrypted Wi-Fi password, and `last_seen_at`. |
| `004_telemetry.sql` | Introduces `energy_metrics` aggregates and raw `device_events` for telemetry ingestion. |
| `005_sessions_notifications.sql` | Adds `user_sessions`, `push_tokens`, and `notification_preferences` for auth hardening and push delivery. |

**Creating/updating the schema**

1. Write SQL in a new sequential file under `backend/database/migrations/NNN_description.sql`.
2. Rebuild TypeScript → `npm run build` (writes `dist/database/migrate.js`).
3. Apply with `npm run migrate`. The runner records filenames in `schema_migrations`, so reruns stay idempotent.
4. (Optional) Update repositories under `backend/src/repositories` if new tables/columns need TypeScript access.

**Seeding** – `database/seed.sql` inserts a demo user, one home, and three rooms. The `npm run seed` script executes `dist/database/seed.js`, which simply pipes that SQL into Postgres.

---

## Repository Atlas

### Root (Expo workspace)

| Path | Description |
| --- | --- |
| `.emergent/` | Local VS Code agent cache (keep ignored). |
| `.expo/` | Expo CLI cache (assets, manifests). |
| `.git/` | Git metadata. |
| `.gitconfig`, `.gitignore` | Repo-specific Git settings and ignore rules. |
| `app.json` | Expo application manifest (bundle ID, icons, deep links). |
| `App.tsx` | Frontend root; wires providers, navigation, and theme. |
| `assets/` | Shared Expo icons (`icon.png`, `splash-icon.png`, `adaptive-icon.png`, `favicon.png`). |
| `babel.config.js` | Metro/Babel configuration for Expo. |
| `index.ts` | Calls `registerRootComponent(App)`; entry point for Expo Go/native builds. |
| `node_modules/` | Root JS dependencies (auto-generated). |
| `package-lock.json`, `package.json` | Workspace dependency graph and npm scripts (Metro, tests). |
| `README.md` | This handbook. |
| `src/` | All frontend TypeScript + assets (see below). |
| `TODO.md` | Open work tracked by area. |
| `tsconfig.json` | Frontend TypeScript compiler options. |
| `backend/` | Express API + migrations. |

### Frontend: `src/`

| Path | Description |
| --- | --- |
| `index.css` | Global web overrides when running Expo for web. |
| `assets/` | Static art referenced only inside the app (`*.png` floor plans, hero art). |
| `components/` | Reusable UI atoms/molecules: `DeviceTile`, `Header`, `InteractiveFloorPlan`, `Model3DViewer`, `RoomCard`. |
| `constants/` | Design tokens and fake data while backend wiring is finished (`theme.ts`, `rooms.ts`, `mockData.ts`). |
| `context/` | `AuthContext.tsx` exposes user/session state to the tree. |
| `hooks/` | Device, energy, home, hub, and realtime hooks (`useDeviceControl`, `useEnergyData`, `useHomeData`, `useHubs`, `useRealtime`). |
| `navigation/` | `AppNavigator.tsx` defines the tab/stack navigators with guards. |
| `screens/` | All feature pages (listed below). |
| `services/` | Frontend service layer: `api.ts` (Axios client), `notifications.ts` (push registration helper), `realtime.ts` (websocket/MQTT bridge). |
| `types/` | Frontend TypeScript contracts (`index.ts`). |

**Screens (`src/screens/`)**

`AutomationsScreen`, `DashboardScreen`, `DeviceGroupsScreen`, `DeviceHistoryScreen`, `DeviceOnboardingWizard`, `DevicesScreen`, `EnergyScreen`, `HomeScreen`, `HomeSelectorScreen`, `HubPairScreen`, `HubSetupWizard`, `ProfileScreen`, `RoomDetailScreen`, `SceneFormScreen`, `ScenesScreen`, `SchedulesScreen`, `SettingsScreen`, `ThermostatScreen`, plus the auth stack inside `screens/Auth/{LoginScreen,SignupScreen}`. Each screen marries hooks + components to the navigation params defined in `AppNavigator`.

### Backend root: `backend/`

| Path | Description |
| --- | --- |
| `.env` | Actual environment variables (never commit). |
| `.env.example` | Safe template with every key documented above. |
| `.gitignore` | Backend-specific ignore patterns. |
| `database/` | Migration runner, SQL migrations, seed data. |
| `dist/` | Transpiled JS output (created by `npm run build`). |
| `node_modules/` | Backend dependencies. |
| `package-lock.json`, `package.json` | Backend dependency graph and scripts (`dev`, `build`, `start`, `migrate`, `seed`). |
| `src/` | TypeScript source (see below). |
| `tsconfig.json` | Compiler options aimed at Node 18.

### Backend source: `backend/src/`

| Path | Description |
| --- | --- |
| `config/database.ts` | Creates the Postgres pool using env vars. |
| `config/jwt.ts` | Shared helpers for signing/verifying JWTs. |
| `controllers/*.controller.ts` | Route handlers for `auth`, `home`, `room`, `device`, `hub`, `scene`, `schedule`, `automation`, `deviceGroup`. Each file imports its repository and any services (MQTT, Node-RED) it needs. |
| `controllers/helpers/homeAccess.ts` | Guard logic that ensures the current user belongs to a home before proceeding. |
| `middleware/auth.ts` | JWT auth middleware (attaches `req.user`). |
| `middleware/errorHandler.ts` | Centralized error-to-response mapping. |
| `middleware/validate.ts` | Joi validator factory per route. |
| `repositories/*.ts` | Data access layer per entity (users, homes, rooms, hubs, devices, automations, schedules, groups, energy). The pattern is: repository abstracts SQL, controller consumes repository. |
| `routes/*.routes.ts` | Express routers that mount controllers under `/api/*`. Filenames mirror controllers so you always know where to look. |
| `server.ts` | Express bootstrap: loads env, registers middleware (`cors`, `json`, `auth`), mounts routers, starts HTTP + websocket servers, and exposes `/health`. |
| `services/cryptoService.ts` | Helper for encrypting Wi-Fi credentials stored on hubs. |
| `services/influxService.ts` | Writes measurement points to InfluxDB. |
| `services/iot.service.ts` | AWS IoT DataPlane client used for device shadow commands. |
| `services/mqttService.ts` | Configures the MQTT client (Mosquitto or AWS IoT) for publishing device control messages. |
| `services/nodeRedService.ts` | Pushes automation and schedule changes to Node-RED via webhooks. |
| `services/scheduler.service.ts` | Cron-style orchestrator that materializes saved schedules. |
| `services/telemetryService.ts` | Persists telemetry into `energy_metrics` / `device_events` and fans data out to websockets. |
| `services/websocket.service.ts` | Socket.IO server that streams live state to the frontend. |
| `types/index.ts` | Backend TypeScript interfaces (request context, domain models). |
| `utils/response.ts` | Standard success/error payload helpers. |
| `utils/validators.ts` | Joi schemas shared across controllers. |

### Backend database assets: `backend/database/`

| Path | Description |
| --- | --- |
| `migrate.ts` | Script invoked by `npm run migrate` to apply SQL files transactionally. |
| `migrations/*.sql` | Ordered schema definition (documented earlier). |
| `seed.sql` | Convenience dataset for demo accounts/homes/rooms. |

> There is currently no `backend/scripts/` directory; feel free to create it for admin tooling if needed.

---

## API Endpoint Reference & Naming

Routes follow a consistent resource-first naming scheme: `/{scope}/{resource}` (e.g., `/api/homes/:homeId/devices/:deviceId`). Files are named `{resource}.routes.ts` and controllers mirror that name. If you add a new domain, create `yourThing.routes.ts`, `yourThing.controller.ts`, and `yourThingRepository.ts` to stay aligned.

| Router | Base Path(s) | Highlights |
| --- | --- | --- |
| `auth.routes.ts` | `/api/auth` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`; uses `auth.controller.ts` and `usersRepository`. |
| `home.routes.ts` | `/api/homes` | CRUD homes, `GET /:homeId/rooms`, `POST /:homeId/rooms`, `PUT /:homeId/layout`, `GET /:homeId/energy`. Naming mirrors the domain entity so the path reads naturally. |
| `device.routes.ts` | `/api/homes/:homeId/devices`, `/api/hubs/:hubId/devices` | Manage devices from either perspective. `/control` and `/learn` suffixes indicate command-type actions. |
| `hub.routes.ts` | `/api/hubs` | `POST /pair`, `POST /:hubId/wifi`, `POST /:hubId/rooms`, `GET /:hubId/status`. Hubs are global to keep QR pairing simple. |
| `scene.routes.ts` | `/api/homes/:homeId/scenes` | Uses `/activate` to make intent explicit and easily searchable in Node-RED flows. |
| `schedule.routes.ts` | `/api/homes/:homeId/schedules` | Mutations emit Node-RED sync jobs; `PUT /:id/enable` vs `disable` keep actions idempotent. |
| `automation.routes.ts` | `/api/homes/:homeId/automations` | Condition → action automations; names track Node-RED workspace IDs. |
| `deviceGroup.routes.ts` | `/api/homes/:homeId/device-groups` | Groups referenced by automations/scenes to broadcast commands. |

**How to change or extend endpoints**

1. Add/adjust Joi schemas in `utils/validators.ts` and wire them via `middleware/validate.ts` in the router.
2. Update the relevant repository so controllers stay thin.
3. Touch the controller and route file together so naming stays synchronized.
4. Re-export or mount the new router in `server.ts` if it is a new top-level file.

---

## Modifying or Extending the System

1. **Add a new database concept** – create migration → update repositories → expose via controller + route → update frontend hooks/services.
2. **Change an API name** – rename `{resource}.routes.ts` and controller together, adjust imports in `server.ts`, and search/replace usage in the frontend `src/services/api.ts`.
3. **New MQTT topic** – define topic naming in `services/mqttService.ts`, update AWS IoT policies accordingly, and document it in the TODO if clients are not ready.
4. **Frontend data flow** – new REST calls should be wrapped in `src/services/api.ts`, typed in `src/types/index.ts`, consumed through hooks, and rendered inside components/screens.

Keep business logic out of routes: controllers orchestrate repositories + services; repositories own SQL; services talk to the outside world (MQTT, Node-RED, websockets).

---

## MQTT, Node-RED & Telemetry

The backend treats MQTT, Node-RED, and the time-series store as server-side infrastructure that the hubs rely on for realtime control. The Expo app never talks to them directly—it sticks to HTTP/WebSockets backed by PostgreSQL—but the services exist to keep hubs and automations in sync.

1. **Mosquitto (MQTT broker)** – the default runtime assumption is a self-hosted Mosquitto instance that all hubs connect to. `services/mqttService.ts` publishes device commands and state updates on topics scoped per home/hub. If you were using AWS IoT instead, you would point the same service at `AWS_IOT_ENDPOINT`, but with Mosquitto you simply configure the broker URL/credentials directly in that service (or add env vars for them).
2. **Node-RED orchestration** – `services/nodeRedService.ts` sends REST webhooks to a Node-RED flow whenever automations or schedules change. Node-RED, in turn, can push MQTT messages or call external services. Document the deployed URL(s) and any shared secrets inside `.env` or the service file.
3. **InfluxDB telemetry** – `services/influxService.ts` and `telemetryService.ts` write live metrics (energy totals, device events) to Influx so dashboards can show real-time charts. Environment variables with the `INFLUXDB_*` prefix tell the service which bucket/org/token to use. If you later switch to AWS Timestream, the code already contains placeholders (`TIMESTREAM_*`).
4. **Why they are mentioned** – hubs publish all live sensor data via MQTT, Node-RED subscribes/coordinates automation logic, and InfluxDB stores the high-frequency telemetry. Even though the mobile app only speaks REST/WebSockets, these backend services must be running for device control, learning, and energy analytics to behave predictably. Keep their configuration documented here so ops and developers understand the full data path.

---

## Operational Playbook

- **Start backend dev server**: `cd backend; npm run dev`
- **Build backend**: `cd backend; npm run build`
- **Run migrations**: `cd backend; npm run migrate`
- **Start Expo**: `npm start`
- **Format/Type-check frontend**: `npx tsc --noEmit`
- **Health check**: `curl http://localhost:8000/health`

When making changes, update `README.md` and `TODO.md` together so future contributors immediately know where things live and what is left to do.
