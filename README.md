<div align="center">
  <img src="public/logo.png" alt="GlobeTrotter Logo" width="100" height="100" />
  <h1>🌍 GlobeTrotter</h1>
  <p><b>Next-Gen AI-Powered Itinerary Planning, Expense Tracking & Travel Product</b></p>

  <p><i>Google Maps × Airbnb × Modern Travel SaaS</i></p>

  <div>
    <a href="https://github.com/Maitra18/Odoo-LDEC"><img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge&logo=github" alt="Status" /></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
    <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" /></a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JS" /></a>
    <a href="#-automated-test-suite"><img src="https://img.shields.io/badge/Tests-11%2F11%20Passing-success?style=for-the-badge&logo=jest" alt="Tests" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" /></a>
  </div>

  <br />

  <a href="http://localhost:3000"><strong>Explore Live Demo »</strong></a>
  &nbsp;•&nbsp;
  <a href="#-api-documentation"><strong>API Docs</strong></a>
  &nbsp;•&nbsp;
  <a href="#-quick-start-guide"><strong>Installation</strong></a>
</div>

---

## 📌 Table of Contents

- [🌟 About GlobeTrotter](#-about-globetrotter)
- [✨ Key Features](#-key-features)
- [🎨 UI/UX & Design Architecture](#-uiux--design-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start Guide](#-quick-start-guide)
- [📊 Real-Time Analytics Product](#-real-time-analytics-product)
- [📡 API Documentation](#-api-documentation)
- [🧪 Automated Test Suite](#-automated-test-suite)
- [👥 Modular Team Architecture](#-modular-team-architecture)
- [📄 License & Authors](#-license--authors)

---

## 🌟 About GlobeTrotter

**GlobeTrotter** is a modern travel-tech application designed for travelers who want to plan, manage, and analyze multi-destination itineraries effortlessly.

Whether you're organizing a dawn hike at Fushimi Inari in Kyoto, a coffee crawl in Melbourne's laneways, or a road trip across Iceland, GlobeTrotter keeps **destinations, days, and budgets moving in the same direction**.

---

## ✨ Key Features

### 🔐 1. Enterprise Authentication & Security
- **Secure Password Hashing**: Utilizes Node.js `scrypt` hashing algorithm with custom salt buffers.
- **Account Protection**: Email normalization, duplicate prevention, and strict password policy (min 8 chars, uppercase, lowercase, numbers).
- **Google Authenticator (TOTP 2FA)**: Two-Factor Authentication during password recovery with single-use emergency backup codes.

### 🗺️ 2. Dynamic Trip & STOP Builder
- **Strict Location Validation**: Enforces hierarchical validation (**Country ➔ State ➔ City**).
- **Multi-Stop Itineraries**: Add, edit, reorder, and remove STOPs and scheduled activities.
- **Dual-Currency Cost Tracking**: Authoritative local currency mapping linked with live reference exchange rates (e.g. `JPY` ➔ `INR`, `EUR` ➔ `INR`).
- **Public & Shared Trips**: Toggle visibility to generate public URLs and allow one-click trip cloning.

### 🤖 3. AI Itinerary Generator
- Generates instant multi-day travel plans tailored to:
  - **Travel Style** (Adventure, Mixed, Cultural, Luxury)
  - **Pace** (Relaxed, Balanced, Fast-paced)
  - **Travellers & Total Budget**

### 📊 4. Real-Time Product Analytics (`GET /api/analytics`)
- **8 KPI Cards**: Total Trips, Destinations, STOPs, Activities, Total Planned Spend, Avg Trip Cost, Avg Duration, Avg Daily Cost.
- **Monthly Frequency Bar Chart**: Trip distribution across Jan–Dec.
- **Category Expense Breakdown**: Progress bars for Accommodation, Transport, Food, Activities, Culture, etc.
- **Automated Insights**: Dynamic travel insights calculated directly from actual user data.

---

## 🎨 UI/UX & Design Architecture

GlobeTrotter's interface follows modern SaaS design principles:

- **Split-Screen Hero Login**: Features a cinematic desert travel background with serif typography (`"Every memorable trip starts with a good plan."`).
- **Sticky Glassmorphism Topbar**: Responsive navigation header with user avatar pills and smooth route state highlighting.
- **Featured Hero Trip Card**: 2-column hero card highlighting upcoming itineraries with budget dual-conversions.

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | HTML5, Modern CSS3 (Custom Properties, Flexbox, CSS Grid), Vanilla JavaScript (ES6+ SPA Engine) |
| **Backend** | Node.js, Express / HTTP Native Micro-framework, Scrypt Crypto Module |
| **Database** | Persistent File-Backed JSON Database Engine (`data/db.json`) |
| **Currency Engine** | Live Exchange Rate Integration (`currencyService.js`) |
| **Test Runner** | Native Node.js Test Runner (`node --test`), `assert` module |

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have **Node.js (v18.0+)** installed on your system.

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/Maitra18/Odoo-LDEC.git

# Navigate into project directory
cd Odoo-LDEC

# Install dependencies
npm install
```

### 2. Run Application

```bash
# Start local server
node server.js
```

Terminal output:
```text
GlobeTrotter is running at http://localhost:3000
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## 📡 API Documentation

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create a new user account | ❌ No |
| `POST` | `/api/auth/login` | Authenticate user & issue session token | ❌ No |
| `POST` | `/api/auth/logout` | Revoke current session token | 🔐 Yes |
| `GET` | `/api/auth/me` | Fetch active authenticated user profile | 🔐 Yes |

### Trip & Itinerary Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/trips` | Fetch all user-scoped trips | 🔐 Yes |
| `POST` | `/api/trips` | Create a new trip itinerary | 🔐 Yes |
| `GET` | `/api/trips/:id` | Fetch specific trip details | 🔐 Yes |
| `POST` | `/api/trips/:id/stops` | Add a new STOP to itinerary | 🔐 Yes |

### Analytics & AI Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics` | Fetch real-time user-scoped travel KPIs & metrics | 🔐 Yes |
| `POST` | `/api/ai/plan` | Generate AI travel recommendation plan | 🔐 Yes |
| `GET` | `/api/currencies/rates` | Fetch authoritative live exchange rates | ❌ No |

---

## 🧪 Automated Test Suite

GlobeTrotter includes 11 automated test suites validating full system integrity:

```bash
npm test
```

### Output:
```text
✔ a registered account can log out, return to login, and authenticate again
✔ a user can persist a complete trip flow across logout and login
✔ private itineraries are owner-protected and shared itineraries can be copied
✔ GET /api/analytics returns real user-scoped travel statistics and respects isolation
✔ Location Hierarchy Validation: Enforces strict Country -> State -> City relationships
✔ Production Auth System 21-Point Comprehensive Test Suite
✔ Google Authenticator (TOTP) 2FA Password Recovery & Security Test Suite
✔ AI Trip Planner & Recommendations Comprehensive Test Suite
✔ Country-Based Currency Mapping & Consistency Test Suite
✔ Currency Converter & Rates Comprehensive Test Suite
✔ Full 28-Step Journey: Auth, Trips, Stops, Activities, Budget, Sharing, Copying

ℹ tests 11 | pass 11 | fail 0 | duration_ms 4200ms
```

---

## 👥 Modular Team Architecture

This project is structured into **4 decoupled technical modules**:

1. 🎨 **Module 1 (Frontend SPA & Design Tokens)**: `public/app.js`, `public/styles.css`, `public/index.html`
2. ⚡ **Module 2 (Backend API & Security Engine)**: `server.js`, `currencyService.js`
3. 💾 **Module 3 (Data Persistence & Schema Engine)**: `data/db.json`
4. 🧪 **Module 4 (QA & Test Automation Suite)**: `tests/` framework

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>GlobeTrotter Travel-Tech Platform © 2026. All rights reserved.</sub>
</div>
