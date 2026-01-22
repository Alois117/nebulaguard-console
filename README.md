# NebulaGuard

**NebulaGuard** is an enterprise-grade, multi-tenant monitoring platform designed for NOC/SOC operations. It provides unified visibility into Zabbix alerts, Veeam backup infrastructure, and system health metrics through role-based dashboards with AI-powered insights.

---

## Problem & Objective

Modern IT operations teams manage complex infrastructure across multiple monitoring tools, making it difficult to maintain situational awareness and respond quickly to incidents. NebulaGuard consolidates monitoring data from Zabbix and Veeam into a single, intuitive interface with intelligent alerting, role-based access control, and AI-assisted analysis.

---

## Key Features

### Monitoring & Alerting
- **Unified Alert Dashboard** — Centralized view of all alerts with severity-based filtering
- **Veeam Backup & Replication Integration** — Real-time alarms and VM infrastructure monitoring
- **Host Management** — Track and manage monitored hosts with detailed metrics
- **SNMP Trap Handling** — Capture and process SNMP traps from network devices

### Role-Based Access Control (RBAC)
- **User Dashboard** (`/dashboard/*`) — Standard monitoring views and reports
- **Organization Admin** (`/admin/*`) — User management, billing, alert configuration, maintenance windows
- **Super Admin** (`/super-admin/*`) — Multi-tenant management, global analytics, feature flags, reseller portal

### AI Assistant
- **Floating AI Chat** — Context-aware assistant available across all internal dashboards
- **AI-Powered Insights** — Intelligent analysis and recommendations for alerts

### Additional Features
- **Command Palette** — Quick navigation and actions via keyboard shortcuts
- **Dark/Light Theme Toggle** — User-configurable theme preference
- **Responsive Design** — Optimized for desktop and mobile viewports
- **Real-time Updates** — WebSocket connectivity indicators for live data

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite 5 |
| **Styling** | Tailwind CSS 3, shadcn/ui components |
| **State Management** | Redux Toolkit, Redux Persist, React Query |
| **Routing** | React Router v6 |
| **Animations** | Framer Motion, GSAP |
| **3D Graphics** | Three.js, React Three Fiber |
| **Forms** | React Hook Form, Zod validation |
| **Charts** | Recharts |
| **Internationalization** | i18n support |

---

## Project Structure

```
src/
├── components/
│   ├── ai/                 # AI chat assistant components
│   ├── alerts/             # Alert management UI
│   ├── dashboard/          # Dashboard widgets and cards
│   ├── layout/             # App layout, header, sidebar
│   ├── loading/            # Skeleton loading states
│   ├── rbac/               # Role-based access components
│   ├── security/           # Audit logging components
│   ├── sli/                # SLI metrics components
│   ├── ui/                 # shadcn/ui base components
│   └── veeam/              # Veeam-specific components
├── hooks/
│   ├── useAlerts.ts        # Alert data fetching
│   ├── useHosts.ts         # Host management
│   ├── useVeeamAlarms.ts   # Veeam alarms integration
│   └── useVeeamInfrastructure.ts  # Veeam VM infrastructure
├── layouts/
│   ├── OrgAdminLayout.tsx  # Organization admin layout
│   ├── SuperAdminLayout.tsx # Super admin layout
│   └── UserLayout.tsx      # Standard user layout
├── pages/
│   ├── landingpage/        # Public landing page
│   ├── org-admin/          # Organization admin pages
│   ├── super-admin/        # Super admin pages
│   └── user/               # User dashboard pages
├── store/                  # Redux store configuration
├── utils/                  # Utility functions (auth, RBAC, masking)
├── i18n/                   # Internationalization config
└── wireframe/              # Wireframe prototypes
```

---

## Environment Setup

### Prerequisites
- Node.js 18+ 
- npm or bun package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nebulacloud

# Install dependencies
npm install
# or
bun install
```

---

## Running Locally

```bash
# Start development server
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:5173`

---

## Build & Deployment

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

### Deployment

The project includes a `vercel.json` configuration for Vercel deployment. The build output is generated in the `dist/` directory.

---

## External Integrations

The application integrates with external monitoring systems via webhooks:

| Integration | Endpoint Purpose |
|-------------|-----------------|
| Veeam Alarms | Fetches backup and replication alarm data |
| Veeam Infrastructure | Fetches VM infrastructure details |

---

## Current Status

**In Development** — The frontend application is feature-complete for core monitoring workflows. Backend integration via webhooks is functional for Veeam data sources. Full Zabbix integration and authentication are pending backend implementation.

---

## License

Proprietary — All rights reserved.
