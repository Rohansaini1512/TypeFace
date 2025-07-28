# Personal Finance Assistant

A personal finance management web application with user authentication, transaction tracking, receipt parsing, and financial analytics.

## Features

- User authentication and data isolation
- Income and expense management
- Transaction history with filtering
- Financial analytics and charts
- Receipt upload with OCR
- PDF statement import
- Responsive design with Tailwind CSS

## Tech Stack

- Frontend: React.js with Vite and Tailwind CSS
- Backend: Node.js with Express.js
- Database: MongoDB Atlas with Mongoose
- Authentication: JWT tokens
- File Upload: Multer
- OCR: Tesseract.js
- PDF Parsing: pdf-parse
- Charts: Chart.js

## Project Structure

```
typeFace/
├── frontend/          # React frontend application
├── backend/           # Node.js/Express backend API
├── database/          # Database setup scripts
└── README.md          # This file
```

## Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- npm or yarn

### MongoDB Atlas Setup

1. Create MongoDB Atlas Account
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account
   - Create a new cluster (M0 Free tier)

2. Configure Database Access
   - Go to Database Access
   - Create a new database user with read/write permissions
   - Remember username and password

3. Configure Network Access
   - Go to Network Access
   - Add your IP address or use `0.0.0.0/0` for all IPs

4. Get Connection String
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

### Installation

1. Clone and navigate to project
   ```bash
   cd typeFace
   ```

2. Install backend dependencies
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies
   ```bash
   cd ../frontend
   npm install
   ```

4. Configure environment variables
   ```bash
   cd ../backend
   # Edit .env file with your MongoDB Atlas URI
   ```

5. Setup database
   ```bash
   npm run setup-db
   ```

### Running the Application

1. Start backend server
   ```bash
   cd backend
   npm start
   ```

2. Start frontend development server
   ```bash
   cd ../frontend
   npm run dev
   ```

3. Open browser and navigate to `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password
- `DELETE /api/auth/account` - Delete account

### Transactions
- `GET /api/transactions` - Get user transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/summary` - Get transaction summary
- `POST /api/transactions/bulk` - Bulk import transactions

### Analytics
- `GET /api/analytics/summary` - Get financial summary
- `GET /api/analytics/categories` - Get category breakdown
- `GET /api/analytics/timeline` - Get timeline data
- `GET /api/analytics/trends` - Get spending trends
- `GET /api/analytics/monthly` - Get monthly breakdown
- `GET /api/analytics/insights` - Get financial insights
- `GET /api/analytics/export` - Export data to CSV

### File Upload
- `POST /api/upload/receipt` - Upload receipt for OCR
- `POST /api/upload/statement` - Upload PDF statement

## Environment Variables

### Backend (.env)
```
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/finance_assistant?retryWrites=true&w=majority
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Development

### Backend Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run setup-db` - Setup database with sample data
- `npm run test-connection` - Test MongoDB connection

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Database Schema

### User
- username (String, unique)
- email (String, unique)
- password (String, hashed)
- timestamps

### Transaction
- userId (ObjectId, ref: User)
- amount (Number)
- type (String: 'income' | 'expense')
- category (String)
- description (String)
- date (Date)
- receiptUrl (String, optional)
- tags (Array of Strings)
- timestamps

### Category
- name (String)
- type (String: 'income' | 'expense')
- color (String)
- userId (ObjectId, ref: User)
- timestamps

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License 