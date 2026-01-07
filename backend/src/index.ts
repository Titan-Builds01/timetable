import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import healthRouter from './routes/health';
import authRouter from './routes/v1/auth';
import sessionsRouter from './routes/v1/sessions';
import timeslotsRouter from './routes/v1/timeslots';
import blockedTimesRouter from './routes/v1/blocked-times';
import courseOfferingsRouter from './routes/v1/course-offerings';
import lecturersRouter from './routes/v1/lecturers';
import roomsRouter from './routes/v1/rooms';
import lecturerAssignmentsRouter from './routes/v1/lecturer-assignments';
import matchingRouter from './routes/v1/matching';
import canonicalCoursesRouter from './routes/v1/canonical-courses';
import constraintsRouter from './routes/v1/constraints';
import eventsRouter from './routes/v1/events';
import runsRouter from './routes/v1/runs';
import locksRouter from './routes/v1/locks';
import exportsRouter from './routes/v1/exports';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/timeslots', timeslotsRouter);
app.use('/api/v1/blocked-times', blockedTimesRouter);
app.use('/api/v1/course-offerings', courseOfferingsRouter);
app.use('/api/v1/lecturers', lecturersRouter);
app.use('/api/v1/rooms', roomsRouter);
app.use('/api/v1/lecturer-assignments', lecturerAssignmentsRouter);
app.use('/api/v1/matching', matchingRouter);
app.use('/api/v1/canonical-courses', canonicalCoursesRouter);
app.use('/api/v1/constraints', constraintsRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/runs', runsRouter);
app.use('/api/v1/locks', locksRouter);
app.use('/api/v1/exports', exportsRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

