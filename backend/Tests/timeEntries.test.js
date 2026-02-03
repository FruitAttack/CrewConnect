import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';


vi.mock('../src/controllers/timeEntriesController.js');
vi.mock('../src/middleware/auth.js', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    req.user = { id: 'test-user-id', company_id: 'test-company-id' };
    next();
  })
}));


import router from '../src/routes/timeEntriesRoutes.js';
import * as controller from '../src/controllers/timeEntriesController.js';
import { authMiddleware } from '../src/middleware/auth.js';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/time-entries', router);
  return app;
};

describe('Time Entries Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================
  // CRON JOB ROUTES (No auth required)
  // ==========================================
  describe('Cron Job Routes', () => {
    it('POST /cron/midnight-split should call processMidnightSplits', async () => {
      controller.processMidnightSplits.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/time-entries/cron/midnight-split')
        .send({ secret: 'test-secret' });

      expect(controller.processMidnightSplits).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('POST /cron/auto-close-stale should call autoCloseStaleEntries', async () => {
      controller.autoCloseStaleEntries.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/time-entries/cron/auto-close-stale')
        .send({ secret: 'test-secret' });

      expect(controller.autoCloseStaleEntries).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('POST /cron/fix-overnight should call fixOvernightEntries', async () => {
      controller.fixOvernightEntries.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/time-entries/cron/fix-overnight')
        .send({ secret: 'test-secret' });

      expect(controller.fixOvernightEntries).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('GET /cron/status should call getCronStatus', async () => {
      controller.getCronStatus.mockImplementation((req, res) => {
        res.status(200).json({ status: 'running' });
      });

      const response = await request(app)
        .get('/api/time-entries/cron/status');

      expect(controller.getCronStatus).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // CLOCK IN/OUT ROUTES
  // ==========================================
  describe('Clock In/Out Routes', () => {
    it('POST /clock-in should call clockIn', async () => {
      controller.clockIn.mockImplementation((req, res) => {
        res.status(201).json({ id: '1', status: 'clocked_in' });
      });

      const response = await request(app)
        .post('/api/time-entries/clock-in')
        .send({ project_id: 'proj-1', cost_code_id: 'cc-1' });

      expect(controller.clockIn).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });

    it('POST /clock-out should call clockOut', async () => {
      controller.clockOut.mockImplementation((req, res) => {
        res.status(200).json({ id: '1', status: 'clocked_out' });
      });

      const response = await request(app)
        .post('/api/time-entries/clock-out')
        .send({ entry_id: '1' });

      expect(controller.clockOut).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('GET /current should call getCurrentTimeEntry', async () => {
      controller.getCurrentTimeEntry.mockImplementation((req, res) => {
        res.status(200).json({ id: '1', status: 'active' });
      });

      const response = await request(app)
        .get('/api/time-entries/current');

      expect(controller.getCurrentTimeEntry).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // TIME ENTRIES CRUD
  // ==========================================
  describe('Time Entries CRUD', () => {
    it('GET / should call getTimeEntries with query params', async () => {
      controller.getTimeEntries.mockImplementation((req, res) => {
        res.status(200).json([{ id: '1' }]);
      });

      const response = await request(app)
        .get('/api/time-entries')
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });

      expect(controller.getTimeEntries).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('PUT /:id should call updateTimeEntry', async () => {
      controller.updateTimeEntry.mockImplementation((req, res) => {
        res.status(200).json({ id: '1', updated: true });
      });

      const response = await request(app)
        .put('/api/time-entries/1')
        .send({ clock_out: '2024-01-01T17:00:00Z' });

      expect(controller.updateTimeEntry).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('DELETE /:id should call deleteTimeEntry', async () => {
      controller.deleteTimeEntry.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/time-entries/1');

      expect(controller.deleteTimeEntry).toHaveBeenCalled();
      expect(response.status).toBe(204);
    });

    it('PUT /:id/cost-code should call updateCostCode', async () => {
      controller.updateCostCode.mockImplementation((req, res) => {
        res.status(200).json({ id: '1', cost_code_id: 'cc-2' });
      });

      const response = await request(app)
        .put('/api/time-entries/1/cost-code')
        .send({ cost_code_id: 'cc-2' });

      expect(controller.updateCostCode).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('PATCH /:id/notes should call updateNotes', async () => {
      controller.updateNotes.mockImplementation((req, res) => {
        res.status(200).json({ id: '1', notes: 'Updated notes' });
      });

      const response = await request(app)
        .patch('/api/time-entries/1/notes')
        .send({ notes: 'Updated notes' });

      expect(controller.updateNotes).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // LOCATION & GEOFENCE ROUTES
  // ==========================================
  describe('Location & Geofence Routes', () => {
    it('GET /nearby-projects should call getNearbyProjects', async () => {
      controller.getNearbyProjects.mockImplementation((req, res) => {
        res.status(200).json([{ id: 'proj-1', distance: 100 }]);
      });

      const response = await request(app)
        .get('/api/time-entries/nearby-projects')
        .query({ latitude: 40.7128, longitude: -74.0060 });

      expect(controller.getNearbyProjects).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('POST /validate-geofence should call validateGeofence', async () => {
      controller.validateGeofence.mockImplementation((req, res) => {
        res.status(200).json({ valid: true });
      });

      const response = await request(app)
        .post('/api/time-entries/validate-geofence')
        .send({ latitude: 40.7128, longitude: -74.0060, project_id: 'proj-1' });

      expect(controller.validateGeofence).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // TIME CALCULATIONS ROUTES
  // ==========================================
  describe('Time Calculations Routes', () => {
    it('GET /seconds-worked/shift should call getSecondsWorkedShift', async () => {
      controller.getSecondsWorkedShift.mockImplementation((req, res) => {
        res.status(200).json({ seconds: 28800 });
      });

      const response = await request(app)
        .get('/api/time-entries/seconds-worked/shift');

      expect(controller.getSecondsWorkedShift).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('GET /seconds-worked/today should call getSecondsWorkedToday', async () => {
      controller.getSecondsWorkedToday.mockImplementation((req, res) => {
        res.status(200).json({ seconds: 28800 });
      });

      const response = await request(app)
        .get('/api/time-entries/seconds-worked/today');

      expect(controller.getSecondsWorkedToday).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('GET /seconds-worked/day should call getSecondsWorkedDay', async () => {
      controller.getSecondsWorkedDay.mockImplementation((req, res) => {
        res.status(200).json({ seconds: 28800 });
      });

      const response = await request(app)
        .get('/api/time-entries/seconds-worked/day')
        .query({ date: '2024-01-01' });

      expect(controller.getSecondsWorkedDay).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('GET /seconds-worked/week should call getSecondsWorkedWeek', async () => {
      controller.getSecondsWorkedWeek.mockImplementation((req, res) => {
        res.status(200).json({ seconds: 144000 });
      });

      const response = await request(app)
        .get('/api/time-entries/seconds-worked/week');

      expect(controller.getSecondsWorkedWeek).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('GET /seconds-worked/month should call getSecondsWorkedMonth', async () => {
      controller.getSecondsWorkedMonth.mockImplementation((req, res) => {
        res.status(200).json({ seconds: 576000 });
      });

      const response = await request(app)
        .get('/api/time-entries/seconds-worked/month');

      expect(controller.getSecondsWorkedMonth).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('GET /seconds-worked/year should call getSecondsWorkedYear', async () => {
      controller.getSecondsWorkedYear.mockImplementation((req, res) => {
        res.status(200).json({ seconds: 6912000 });
      });

      const response = await request(app)
        .get('/api/time-entries/seconds-worked/year');

      expect(controller.getSecondsWorkedYear).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // BREAK ROUTES
  // ==========================================
  describe('Break Routes', () => {
    it('POST /break/start should call startBreak', async () => {
      controller.startBreak.mockImplementation((req, res) => {
        res.status(201).json({ id: 'break-1', status: 'on_break' });
      });

      const response = await request(app)
        .post('/api/time-entries/break/start')
        .send({ entry_id: '1' });

      expect(controller.startBreak).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });

    it('POST /break/end should call endBreak', async () => {
      controller.endBreak.mockImplementation((req, res) => {
        res.status(200).json({ id: 'break-1', status: 'ended' });
      });

      const response = await request(app)
        .post('/api/time-entries/break/end')
        .send({ break_id: 'break-1' });

      expect(controller.endBreak).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('GET /break/current should call getCurrentBreak', async () => {
      controller.getCurrentBreak.mockImplementation((req, res) => {
        res.status(200).json({ id: 'break-1', status: 'active' });
      });

      const response = await request(app)
        .get('/api/time-entries/break/current');

      expect(controller.getCurrentBreak).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // ROSTER/MANAGEMENT ROUTES
  // ==========================================
  describe('Roster/Management Routes', () => {
    it('GET /roster/:company_id should call getActiveRoster', async () => {
      controller.getActiveRoster.mockImplementation((req, res) => {
        res.status(200).json([{ user_id: 'user-1', status: 'active' }]);
      });

      const response = await request(app)
        .get('/api/time-entries/roster/test-company-id');

      expect(controller.getActiveRoster).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('GET /manage/active should call getActiveRoster', async () => {
      controller.getActiveRoster.mockImplementation((req, res) => {
        res.status(200).json([{ user_id: 'user-1', status: 'active' }]);
      });

      const response = await request(app)
        .get('/api/time-entries/manage/active');

      expect(controller.getActiveRoster).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('POST /manage/:user_id/clock-in should call clockInForUser', async () => {
      controller.clockInForUser.mockImplementation((req, res) => {
        res.status(201).json({ id: '1', user_id: 'user-2' });
      });

      const response = await request(app)
        .post('/api/time-entries/manage/user-2/clock-in')
        .send({ project_id: 'proj-1', cost_code_id: 'cc-1' });

      expect(controller.clockInForUser).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });

    it('POST /manage/:user_id/clock-out should call clockOutForUser', async () => {
      controller.clockOutForUser.mockImplementation((req, res) => {
        res.status(200).json({ id: '1', user_id: 'user-2' });
      });

      const response = await request(app)
        .post('/api/time-entries/manage/user-2/clock-out');

      expect(controller.clockOutForUser).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('POST /manage/:user_id/switch-task should call switchTaskForUser', async () => {
      controller.switchTaskForUser.mockImplementation((req, res) => {
        res.status(200).json({ id: '2', user_id: 'user-2' });
      });

      const response = await request(app)
        .post('/api/time-entries/manage/user-2/switch-task')
        .send({ project_id: 'proj-2', cost_code_id: 'cc-2' });

      expect(controller.switchTaskForUser).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('POST /manage/:user_id/break/start should call startBreakForUser', async () => {
      controller.startBreakForUser.mockImplementation((req, res) => {
        res.status(201).json({ id: 'break-1', user_id: 'user-2' });
      });

      const response = await request(app)
        .post('/api/time-entries/manage/user-2/break/start');

      expect(controller.startBreakForUser).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });

    it('POST /manage/:user_id/break/end should call endBreakForUser', async () => {
      controller.endBreakForUser.mockImplementation((req, res) => {
        res.status(200).json({ id: 'break-1', user_id: 'user-2' });
      });

      const response = await request(app)
        .post('/api/time-entries/manage/user-2/break/end');

      expect(controller.endBreakForUser).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  // ==========================================
  // AUTHENTICATION TESTS
  // ==========================================
  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      // Mock auth middleware to reject
      authMiddleware.mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/api/time-entries/clock-in')
        .send({ project_id: 'proj-1' });

      expect(response.status).toBe(401);
    });

    it('should not require authentication for cron routes', async () => {
      controller.processMidnightSplits.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/time-entries/cron/midnight-split')
        .send({ secret: 'test-secret' });

      expect(response.status).toBe(200);
      expect(authMiddleware).not.toHaveBeenCalled();
    });
  });
});