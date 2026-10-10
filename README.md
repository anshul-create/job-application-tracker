# Job Application Tracker

A full-stack web application to track job applications, interviews, and hiring pipeline progress.

## Tech Stack

**Frontend:** React, Vite, React Query, React Router, Axios  
**Backend:** Node.js, Express, MongoDB, Mongoose, JWT

## Project Structure

```
job-application-layer/
├── client/   # React + Vite frontend
├── server/   # Node.js + Express backend
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)

### Install dependencies

```bash
npm run install:all
```

### Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit both `.env` files with your values.

### Run in development

```bash
npm run dev
```

The client runs on `http://localhost:5173` and the server on `http://localhost:5000`.

## Scripts

| Command              | Description                             |
| -------------------- | --------------------------------------- |
| `npm run dev`        | Run both client and server concurrently |
| `npm run dev:server` | Run server only                         |
| `npm run dev:client` | Run client only                         |
| `npm run build`      | Build client for production             |
| `npm run test`       | Run server tests                        |
