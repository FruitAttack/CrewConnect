import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import LaborOverview from '../../app/(app)/project/laborOverview';
import { useSession } from '../../utils/ctx';
import { useLocalSearchParams } from 'expo-router';
import { useProject } from '../../app/components/projectComponents/projectContext';
import {
  getAllProjectCostCodes,
  getTimeEntries,
  getUserProfile,
  getAllUsers,
  getBudgetPrediction,
} from '../../utils/api';

jest.mock('../../utils/ctx');
jest.mock('expo-router');
jest.mock('../../app/components/projectComponents/projectContext');
jest.mock('../../utils/api');

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const FIXED_NOW = new Date(2026, 2, 18, 12, 0, 0);

describe('LaborOverview screen', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    jest.clearAllMocks();

    useSession.mockReturnValue({
      session: {
        access_token: 'token123',
      },
    });

    useLocalSearchParams.mockReturnValue({});

    useProject.mockReturnValue({
      selectedProject: {
        id: 'proj-1',
        created_at: '2026-03-01T08:00:00.000Z',
      },
      selectedProjectId: 'proj-1',
    });

    getUserProfile.mockResolvedValue({
      success: true,
      data: { user: { default_company_id: 77 } },
    });

    getAllProjectCostCodes.mockResolvedValue({
      success: true,
      data: [],
    });

    getTimeEntries.mockResolvedValue({
      success: true,
      data: { time_entries: [] },
    });

    getAllUsers.mockResolvedValue({
      success: true,
      data: { users: [] },
    });

    getBudgetPrediction.mockResolvedValue({
      success: true,
      data: null,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('loads labor data, computes totals, and renders active and inactive job cards', async () => {
    getAllProjectCostCodes.mockResolvedValueOnce({
      success: true,
      data: [
        {
          cost_code_id: 'cc1',
          is_active: true,
          budgeted_hours: 12,
          budgeted_labor_cost: 240,
          cost_code: {
            id: 'cc1',
            code: '01-100',
            name: 'Site Prep',
          },
        },
        {
          cost_code_id: 'cc2',
          is_active: false,
          budgeted_hours: 8,
          budgeted_labor_cost: 500,
          cost_code: {
            id: 'cc2',
            code: '02-200',
            name: 'Concrete',
          },
        },
      ],
    });

    getTimeEntries.mockResolvedValueOnce({
      success: true,
      data: {
        time_entries: [
          {
            cost_code_id: 'cc1',
            user_id: 1,
            clock_in: '2026-03-03T08:00:00.000Z',
            clock_out: '2026-03-03T12:00:00.000Z',
            break_minutes: 0,
          },
          {
            cost_code_id: 'cc1',
            user_id: 2,
            clock_in: '2026-03-04T09:00:00.000Z',
            clock_out: '2026-03-04T12:00:00.000Z',
            break_minutes: 0,
          },
          {
            cost_code_id: 'cc2',
            user_id: 3,
            hourly_rate: 30,
            clock_in: '2026-03-05T08:00:00.000Z',
            clock_out: '2026-03-05T10:30:00.000Z',
            break_minutes: 0,
          },
        ],
      },
    });

    getAllUsers.mockResolvedValueOnce({
      success: true,
      data: {
        users: [
          {
            id: 1,
            user_employment: [{ hourly_rate: 20 }],
          },
          {
            id: 2,
            employment: { salary_annual: 52000 },
          },
          {
            id: 3,
            user_employment: [{ hourly_rate: 18 }],
          },
        ],
      },
    });

    render(<LaborOverview />);

    expect(screen.getByText('Loading labor overview…')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Project Totals')).toBeTruthy());

    expect(getUserProfile).toHaveBeenCalledWith('token123');
    expect(getAllProjectCostCodes).toHaveBeenCalledWith('token123', 'proj-1');
    expect(getAllUsers).toHaveBeenCalledWith('token123', { company_id: 77 });
    expect(getTimeEntries).toHaveBeenCalledWith('token123', 77, {
      project_id: 'proj-1',
      start_date: '2026-03-01',
      end_date: '2026-03-18',
      all_users: 'true',
    });

    expect(screen.getByText('Project Health')).toBeTruthy();
    expect(screen.getByText('Budgeted vs actual labor by cost code')).toBeTruthy();

    expect(screen.getByText('Active Jobs')).toBeTruthy();
    expect(screen.getByText('Inactive Jobs')).toBeTruthy();

    expect(screen.getByText('01-100')).toBeTruthy();
    expect(screen.getByText('Site Prep')).toBeTruthy();
    expect(screen.getByText('7.0h / 12.0h')).toBeTruthy();
    expect(screen.getByText('$155.00 / $240.00')).toBeTruthy();

    expect(screen.getByText('02-200')).toBeTruthy();
    expect(screen.getByText('Concrete')).toBeTruthy();
    expect(screen.getByText('2.5h / 8.0h')).toBeTruthy();
    expect(screen.getByText('$75.00 / $500.00')).toBeTruthy();
  });

  test('prefers route param projectId and omits start_date when selectedProject is missing', async () => {
    useLocalSearchParams.mockReturnValue({ projectId: 'route-project' });

    useProject.mockReturnValue({
      selectedProject: null,
      selectedProjectId: 'context-project',
    });

    getUserProfile.mockResolvedValueOnce({
      success: true,
      data: { user: { default_company_id: 88 } },
    });

    render(<LaborOverview />);

    await waitFor(() =>
      expect(getAllProjectCostCodes).toHaveBeenCalledWith('token123', 'route-project')
    );

    expect(getTimeEntries).toHaveBeenCalledWith('token123', 88, {
      project_id: 'route-project',
      end_date: '2026-03-18',
      all_users: 'true',
    });

    expect(screen.queryByText('Active Jobs')).toBeNull();
    expect(screen.queryByText('Inactive Jobs')).toBeNull();
  });

  test('uses direct users array payloads and entry salary_rate fallback when computing cost', async () => {
    getAllProjectCostCodes.mockResolvedValueOnce({
      success: true,
      data: [
        {
          cost_code_id: 'cc9',
          is_active: true,
          budgeted_hours: 6,
          budgeted_labor_cost: 180,
          cost_code: {
            id: 'cc9',
            code: '09-900',
            name: 'Cleanup',
          },
        },
      ],
    });

    getTimeEntries.mockResolvedValueOnce({
      success: true,
      data: {
        time_entries: [
          {
            cost_code_id: 'cc9',
            user_id: 55,
            salary_rate: 62400,
            clock_in: '2026-03-06T08:00:00.000Z',
            clock_out: '2026-03-06T12:00:00.000Z',
            break_minutes: 30,
          },
        ],
      },
    });

    getAllUsers.mockResolvedValueOnce({
      success: true,
      data: [{ id: 55 }],
    });

    render(<LaborOverview />);

    await waitFor(() => expect(screen.getByText('Cleanup')).toBeTruthy());

    expect(screen.getByText('09-900')).toBeTruthy();
    expect(screen.getByText('Cleanup')).toBeTruthy();
  });
});