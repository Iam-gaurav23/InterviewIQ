# InterviewIQ — AI-Powered Interview Preparation Platform

InterviewIQ is a full-stack web application designed to help users prepare for interviews through AI-generated interview questions, interactive practice sessions, performance reports, and interview history tracking.

## Features

- **AI-Powered Question Generation:** Generate interview questions based on job roles, skills, experience, and projects.
- **Multiple Interview Modes:** Practice HR and technical interviews.
- **Interactive Interview Sessions:** Answer questions in a structured interview environment.
- **Performance Reports:** Review interview feedback and identify areas for improvement.
- **Interview History:** Access previous interview sessions and reports.
- **User Authentication:** Secure user access with authentication and protected routes.
- **Credit-Based Access:** Manage usage through a credit-based system.
- **Payment Integration:** Support payment processing through Razorpay.
- **Responsive UI:** Access the application across different screen sizes.

## Tech Stack

**Frontend**
- React.js
- Vite
- Tailwind CSS
- Redux Toolkit

**Backend**
- Node.js
- Express.js
- RESTful APIs
- JWT Authentication
- Multer

**Database**
- MongoDB
- Mongoose

**AI Integration**
- OpenRouter API for AI-powered question generation and responses

**Authentication & Payments**
- Firebase Authentication
- Razorpay

## Project Structure

```text
InterviewIQ/
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── redux/
│       └── utils/
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── index.js
│
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- MongoDB database
- Git

You will also need the API credentials required by the services you configure.

### 1. Clone the Repository

```bash
git clone https://github.com/Iam-gaurav23/InterviewIQ.git
cd InterviewIQ
```

### 2. Set Up the Backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory and configure your environment variables:

```env
PORT=8000
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENROUTER_API_KEY=your_openrouter_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Use the variable names expected by your actual server code. Keep all secret values private.

Start the backend using the script configured in `server/package.json`. For example:

```bash
npm run dev
```

### 3. Set Up the Frontend

Open a new terminal:

```bash
cd client
npm install
```

Configure any required frontend environment variables, such as Firebase configuration and the backend API URL, according to your client code.

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

## Security

- Store API keys and credentials in environment variables.
- Never commit `.env` files or other sensitive credentials.
- Validate incoming requests and protect authenticated routes.
- Keep payment credentials on the backend.

## Project Goal

InterviewIQ aims to make interview preparation more accessible and structured by combining AI-generated questions with interactive practice and performance tracking.

## Author

**Gaurav Prajapati**

- GitHub: [Iam-gaurav23](https://github.com/Iam-gaurav23)

---

*Built as a full-stack project to explore AI integration, web development, authentication, and payment workflows.*
