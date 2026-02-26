# Petlib Server (Auth + MongoDB)

## Setup
1. `cp .env.example .env`
2. Modifie `MONGO_URI` et `JWT_SECRET`
3. `npm install`
4. `npm run dev`

Endpoints:
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET  `/api/auth/me`
