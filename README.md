# Smart SQL Exam Platform

A complete, production-ready full-stack web application designed to schedule, manage, take, and grade SQL queries manually with interactive AI hint assistance.

## Technology Stack

- **Frontend**: React (Vite), Bootstrap 5 (No Tailwind CSS), Custom Glassmorphism CSS, React Router v6, Monaco Editor, Chart.js.
- **Backend**: Node.js, Express.js, JWT, bcrypt, Helmet, CORS, Express-Validator, Rate Limiter.
- **Database**: MySQL.

---

## Getting Started

### Database Configuration
1. Open your MySQL client and run the SQL instructions located in:
   [schema.sql](file:///d:/EXAM_APP/schema.sql)
2. This creates the database `smart_sql_exam` and imports mock seed data.

### Configuration
1. Update `.env` in the root project if your MySQL credentials differ:
   [env config](file:///d:/EXAM_APP/.env)

---

## Installation & Launch

### Run Backend Server
1. From the root directory:
   ```bash
   npm run start
   ```
   (Alternatively, run `node server/index.js`)

### Run Frontend Client
1. Navigate to the frontend folder and run the Vite dev server:
   ```bash
   cd frontend
   npm run dev
   ```

---

## Seed Accounts (Password: `password123`)
- **Admin**: `admin@platform.com`
- **Teacher**: `teacher1@platform.com`
- **Student**: `student1@platform.com`
