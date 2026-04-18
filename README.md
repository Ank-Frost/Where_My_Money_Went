# 💰 Where My Money Went

A full-stack personal finance tracker with a dark UI, built with React + Node.js + MySQL.

---

## Features

- ✅ Income & expense tracking with categories, tags, modes
- ✅ Daily / Weekly / Monthly / Yearly transaction views
- ✅ Full-text search with filters (category, tag, date, mode)
- ✅ Budget alerts — monthly & category-wise
- ✅ Split expenses with people & groups
- ✅ Subscription tracker with renewal reminders
- ✅ Financial goals with savings allocation
- ✅ Browser push notifications
- ✅ JWT authentication (single-user)
- ✅ Dark UI inspired by finance apps

---

## Prerequisites

- **Node.js** v18+
- **MySQL** 8.0+
- A modern browser (Chrome/Edge recommended for push notifications)

---

## Setup Instructions

### Step 1 — MySQL Setup

```bash
# Log in to MySQL
mysql -u root -p

# Run the schema
SOURCE /path/to/where-my-money-went/backend/schema.sql;
# or
mysql -u root -p < backend/schema.sql
```

### Step 2 — Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy env file and edit it
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=money_tracker

JWT_SECRET=change_this_to_a_long_random_string

# Generate VAPID keys (run once):
# npm run generate-vapid
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:you@example.com

FRONTEND_URL=http://localhost:5173
```

**Generate VAPID keys** for push notifications:

```bash
npm run generate-vapid
# Copy the output into your .env file
```

Start backend:

```bash
npm run dev     # development (with nodemon)
npm start       # production
```

### Step 3 — Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## First Time Use

1. Open the app — you'll be redirected to `/login`
2. Click "Create your account" to go to `/setup`
3. Enter a username and password (min 6 chars)
4. You're logged in! Start adding transactions.

When the browser asks for **notification permission**, allow it to enable budget alerts and subscription reminders.

---

## Project Structure

```
where-my-money-went/
├── backend/
│   ├── schema.sql                  # MySQL schema (run this first)
│   ├── .env.example                # Copy to .env
│   ├── package.json
│   └── src/
│       ├── app.js                  # Express entry point
│       ├── config/db.js            # MySQL pool
│       ├── middleware/auth.js      # JWT middleware
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── transactionController.js
│       │   ├── budgetController.js
│       │   ├── tagController.js
│       │   ├── notificationController.js
│       │   ├── splitController.js
│       │   ├── subscriptionController.js
│       │   └── goalController.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── transactions.js
│       │   ├── budgets.js
│       │   ├── tags.js
│       │   ├── notifications.js
│       │   ├── splits.js
│       │   ├── subscriptions.js
│       │   └── goals.js
│       └── utils/scheduler.js      # cron jobs for reminders
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx                 # Routes
        ├── index.css               # Tailwind + custom styles
        ├── services/api.js         # Axios API calls
        ├── context/
        │   ├── AuthContext.jsx
        │   └── NotificationContext.jsx
        ├── utils/
        │   ├── helpers.js          # Formatting, categories
        │   └── useDebounce.js
        ├── components/
        │   ├── Layout/Layout.jsx
        │   ├── Transactions/
        │   │   ├── TransactionForm.jsx
        │   │   └── TransactionCard.jsx
        │   └── common/ConfirmModal.jsx
        └── pages/
            ├── LoginPage.jsx       (also exports SetupPage)
            ├── SetupPage.jsx
            ├── DashboardPage.jsx
            ├── TransactionsPage.jsx
            ├── SearchPage.jsx
            ├── BudgetPage.jsx
            ├── SplitPage.jsx
            ├── SubscriptionsPage.jsx
            ├── GoalsPage.jsx
            ├── NotificationsPage.jsx
            └── SettingsPage.jsx
```

---

## Notification Schedule

| Trigger | When |
|---|---|
| Budget alert | After every expense transaction |
| Budget setup reminder | 1st of each month (if no budget set) |
| Subscription reminder | 5 days before, 3 days before, 1 day before, day of |

---

## Building for Production

```bash
# Frontend
cd frontend
npm run build
# Output: frontend/dist/

# Backend
cd backend
NODE_ENV=production npm start
```

Serve `frontend/dist/` with nginx or any static server, and point API requests to the backend port.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Recharts, React Router v6 |
| Backend | Node.js, Express, MySQL2, JWT, node-cron |
| Push | Web Push API + Service Worker |
| Database | MySQL 8.0 |
