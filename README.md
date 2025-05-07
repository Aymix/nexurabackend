# UiFormNexura Backend

This is the Express/MongoDB backend server for the UiFormNexura application. It replaces the previous Prisma implementation with Mongoose.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb+srv://aymenhmida1:kGJInUb8eD6meHBt@cluster0.ftir2.mongodb.net/nexuradb?retryWrites=true&w=majority&appName=Cluster0&tls=true
FRONTEND_URL=http://localhost:3000
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Posts

- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post with AI-generated content
- `GET /api/posts/:id` - Get a specific post by ID
- `PUT /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post
- `POST /api/posts/:id/regenerate` - Regenerate content for a post

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── index.js         # Main application entry point
├── .env                 # Environment variables (create this file)
├── package.json         # Project dependencies and scripts
└── README.md            # This file
```

## Technologies Used

- Node.js
- Express.js
- Mongoose (MongoDB ODM)
- Google Gemini API for content generation
