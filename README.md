# demon8n - User Management API

A lightweight Node.js Express microservice for managing user profiles.

## Features

- RESTful API endpoints for retrieving user records
- SQLite database integration with auto-seeding
- Simple and lightweight architecture

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
npm install
```

### Running the Application

```bash
npm start
```

The server will start at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/users` | Get all users |
| GET | `/users/:id` | Get user by ID |

## Example Requests

```bash
# Health Check
curl http://localhost:3000/health

# Get All Users
curl http://localhost:3000/users

# Get User by ID
curl http://localhost:3000/users/1
```
