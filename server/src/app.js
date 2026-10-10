import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import authRoutes from './modules/auth/auth.routes.js';
import applicationRoutes from './modules/applications/application.routes.js';
import { applicationInterviewRouter, interviewRouter } from './modules/interviews/interview.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

const app = express();

app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/applications', applicationInterviewRouter);
app.use('/api/v1/interviews', interviewRouter);
app.use('/api/v1/dashboard', dashboardRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

export default app;
