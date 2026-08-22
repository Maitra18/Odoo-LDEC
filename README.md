# 🌍 GlobeTrotter — Premium Modern Travel-Tech Platform

> **Google Maps × Airbnb × Modern Travel SaaS**  
> A production-grade, full-stack travel itinerary planning, real-time analytics, and AI recommendation platform built with Node.js, Express, and Vanilla JavaScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-v18%2B-green.svg)
![Tests](https://img.shields.io/badge/tests-11%2F11%20passing-success.svg)
![Status](https://img.shields.io/badge/status-production%20ready-brightgreen.svg)

---

## 📸 Overview & Visual Highlights

GlobeTrotter transforms trip planning into an intuitive, visual experience. From AI-assisted destination recommendations to real-time currency conversion and multi-currency expense tracking, GlobeTrotter keeps destinations, days, and budgets moving in the same direction.

- 🔒 **Production-Grade Authentication**: Scrypt password hashing, session tokens, account registration validation, and Google Authenticator (TOTP 2FA) password recovery.
- 🎨 **Cinematic UI/UX Layout**: Full-height split-screen hero login with serif typography (`TRAVEL, WITH INTENTION`), sticky responsive topbar, and featured trip hero cards.
- 📊 **Real-Time Data Analytics**: 12-section real-time analytics product calculated dynamically from user trips, STOPs, activities, and budgets (`GET /api/analytics`).
- 🤖 **AI Itinerary Planner**: Instant AI-powered itinerary generator tailored to travel style, travellers, pace, and budget.
- 💱 **Authoritative Live Currency Linking**: Dual-currency presentation (`JPY`, `USD`, `EUR`, `GBP`, `INR`) linked with live rate feeds.

---

## ✨ Features

### 1. 🔐 Security & Production Authentication
- Secure registration & login with scrypt password hashing.
- Email verification flow & strong password policy enforcement.
- **Google Authenticator (TOTP) 2FA** integration with single-use backup recovery codes.
- Owner-protected private itineraries and authorization guards.

### 2. 🗺️ Itinerary & STOP Builder
- Hierarchical location management (**Country ➔ State ➔ City**).
- Dynamic STOP creation, activity scheduling, drag/reordering, and cost allocation.
- Public/Private visibility toggles with shareable URLs and one-click trip cloning.

### 3. 📊 Real-Time Analytics Dashboard
- **8 KPI Cards**: Total Trips, Destinations, STOPs, Activities, Planned Spend, Avg Cost, Avg Duration, Avg Daily Cost.
- **Visual Distribution**: Monthly travel frequency bar chart, trip status breakdown (`Upcoming`, `Ongoing`, `Completed`), category expense progress bars, budget utilization percentages, and top destinations.
- **Automated Data Insights**: Dynamic travel insights generated directly from user history.

### 4. 💱 Live Currency Engine
- Authoritative destination currency mapping (e.g., Japan ➔ `JPY`, France ➔ `EUR`, USA ➔ `USD`).
- Real-time exchange rate updates with live INR dual-currency references.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Modern CSS3 (Custom Properties, Grid, Flexbox), Vanilla ES6+ JavaScript, Single Page Application (SPA) Router.
- **Backend**: Node.js, Express / Native HTTP Micro-framework.
- **Database**: File-backed JSON Database Engine with transaction isolation (`data/db.json`).
- **Testing Framework**: Native Node.js Test Runner (`node --test`), 11 Automated Test Suites (100% Pass Rate).

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation & Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Maitra18/Odoo-LDEC.git

# 2. Navigate into project directory
cd Odoo-LDEC

# 3. Install dependencies
npm install

# 4. Start local development server
node server.js
# or
npm start
```

Open your browser and navigate to:  
👉 **`http://localhost:3000`**

---

## 🧪 Running Automated Tests

GlobeTrotter includes a comprehensive 11-suite automated test framework covering authentication, security, location hierarchy, AI planning, currency mapping, analytics isolation, and full 28-step user journeys.

```bash
npm test
```

### Test Suite Summary:
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

ℹ tests 11 | pass 11 | fail 0
```

---

## 📁 Repository Structure & Team Division

```text
Odoo-LDEC/
├── public/                 # Frontend Single-Page Application (SPA)
│   ├── index.html          # Main HTML Shell
│   ├── styles.css          # Modern CSS Layout, Grid, & Design Token System
│   ├── app.js              # SPA Routing, Component Mounts, & State Manager
│   └── logo.png            # Official GlobeTrotter Brand Logo
├── server.js               # Node.js Server, API Routes, & Auth Controller
├── currencyService.js      # Exchange Rates Engine & Currency Service
├── data/
│   └── db.json             # Persistent JSON Database State
├── tests/                  # Automated Test Suite (11 Test Suites)
│   ├── api.test.js
│   ├── auth.test.js
│   ├── flow.test.js
│   └── ...
└── package.json            # Project Manifest & Scripts
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.

---

<div align="center">
  <sub>Built with ❤️ for travellers around the world.</sub>
</div>
