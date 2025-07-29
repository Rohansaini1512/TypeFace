# Personal Finance Assistant

A web application for personal finance management with user authentication, transaction tracking, receipt parsing (OCR), PDF import, and analytics. Built with React (Vite, Tailwind CSS), Node.js/Express, and MongoDB Atlas. Fully containerized with Docker Compose.

## Features
- User registration, login, JWT authentication
- Income and expense tracking
- Transaction list with filters and pagination
- Analytics: charts by category/date
- Receipt upload with OCR (image/PDF)
- PDF statement import
- Responsive UI (Tailwind CSS)

## Tech Stack
- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB Atlas (Mongoose)
- OCR: Tesseract.js
- PDF: pdf-parse
- Charts: Chart.js
- Containerization: Docker, Docker Compose

## Project Structure
```
typeFace/
├── frontend/   # React app (Vite, Tailwind)
├── backend/    # Express API (Node.js)
├── docker-compose.yml
└── README.md
```

## Quick Start (Docker Compose)

### Prerequisites
- Docker & Docker Compose
- MongoDB Atlas account (get your connection URI)

### 1. Set up environment variables
Create a `.env` file in the project root (or export in your shell):
```
MONGODB_URI=your_mongodb_atlas_uri
GEMINI_API_KEY=your_google_gemini_api_key
```

### 2. Build and run all services
```bash
MONGODB_URI=your_mongodb_atlas_uri GEMINI_API_KEY=your_google_gemini_api_key docker-compose up --build
```
- Frontend: http://localhost:4173
- Backend API: http://localhost:5001/api

### 3. Stop services
```bash
docker-compose down
```

## Manual Development (No Docker)
1. Install dependencies in both `backend/` and `frontend/`
2. Set up `.env` files as below
3. Start backend (`npm start` in `backend/`)
4. Start frontend (`npm run dev` in `frontend/`)

## Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_atlas_uri
GEMINI_API_KEY=your_google_gemini_api_key
NODE_ENV=development
```
- `GEMINI_API_KEY` is used for Google Gemini API integration (for advanced OCR or AI features).

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:5001/api
```

## API Endpoints (Summary)
- `POST   /api/auth/register`   Register
- `POST   /api/auth/login`      Login
- `GET    /api/auth/profile`    Get profile
- `PUT    /api/auth/profile`    Update profile
- `PUT    /api/auth/password`   Change password
- `DELETE /api/auth/account`    Delete account
- `GET    /api/transactions`    List transactions
- `POST   /api/transactions`    Add transaction
- `PUT    /api/transactions/:id` Update transaction
- `DELETE /api/transactions/:id` Delete transaction
- `GET    /api/transactions/summary` Summary
- `POST   /api/transactions/bulk` Bulk import
- `GET    /api/analytics/*`     Analytics endpoints
- `POST   /api/upload/receipt`  Upload receipt (OCR)
- `POST   /api/upload/statement` Upload PDF statement

## Database Models
- **User**: username, email, password (hashed)
- **Transaction**: userId, amount, type, category, description, date, receiptUrl, tags
- **Category**: name, type, color, userId

## Scripts
### Backend
- `npm start`      Start server
- `npm run dev`    Dev mode (nodemon)
- `npm run setup-db`  Seed database
- `npm run test-connection`  Test DB connection

### Frontend
- `npm run dev`    Dev server
- `npm run build`  Build for production
- `npm run preview` Preview build
- `npm run lint`   Lint code

## License
MIT 