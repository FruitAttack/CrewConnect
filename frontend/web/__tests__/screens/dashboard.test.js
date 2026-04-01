import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

import Dashboard from '../../app/(app)/dashboard';
import { useSession } from '../../utils/ctx';
import { useRouter } from 'expo-router';
import {
  getProjects,
  getAllUsers,
  getUserProfile,
  getTimeEntries,
  getActiveRoster,
} from '../../utils/api';
import { calculateHoursInRange } from '../../utils/timeUtils';

jest.mock('../../utils/ctx');
jest.mock('expo-router');
jest.mock('../../utils/api');
jest.mock('../../utils/timeUtils');

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const FIXED_NOW = new Date(2026, 2, 18, 12, 0, 0);

function formatYYYYMMDDLocal(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekRange(now = new Date()) {
  const dayOfWeek = now.getDay();

  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    startDate: start,
    endDate: end,
    startStr: formatYYYYMMDDLocal(start),
    endStr: formatYYYYMMDDLocal(end),
  };
}

function getMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    startDate: start,
    endDate: end,
    startStr: formatYYYYMMDDLocal(start),
    endStr: formatYYYYMMDDLocal(end),
  };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildEntry(date, startHour, durationHours) {
  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationHours * 60);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

describe('Dashboard screen', () => {
  let pushMock;

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

    pushMock = jest.fn();
    useRouter.mockReturnValue({ push: pushMock });

    useSession.mockReturnValue({
      session: {
        access_token: 'token123',
        user: {
          email: 'jane@example.com',
          user_metadata: {
            full_name: 'Jane Manager',
            default_company_id: 42,
          },
        },
      },
    });

    getUserProfile.mockResolvedValue({
      success: true,
      data: { user: { default_company_id: 42 } },
    });
    getProjects.mockResolvedValue({ success: true, data: { projects: [] } });
    getAllUsers.mockResolvedValue({ success: true, data: { users: [] } });
    getActiveRoster.mockResolvedValue({ success: true, data: { roster: [] } });
    getTimeEntries.mockResolvedValue({ success: true, data: [] });

    calculateHoursInRange.mockImplementation((entries, rangeStart, rangeEnd) => {
      if (!Array.isArray(entries) || entries.length === 0) return 0;

      const startMs = new Date(rangeStart).getTime();
      const endMs = new Date(rangeEnd).getTime();

      const total = entries.reduce((sum, entry) => {
        const entryStart = new Date(entry.start).getTime();
        const entryEnd = new Date(entry.end).getTime();
        const overlapStart = Math.max(startMs, entryStart);
        const overlapEnd = Math.min(endMs, entryEnd);

        if (overlapEnd <= overlapStart) return sum;
        return sum + (overlapEnd - overlapStart) / 3600000;
      }, 0);

      return Number(total.toFixed(2));
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('fetches dashboard data and renders calculated stats plus active projects', async () => {
    const week = getWeekRange(FIXED_NOW);
    const month = getMonthRange(FIXED_NOW);

    const weekEntries = [
      buildEntry(addDays(week.startDate, 1), 9, 3.5),
      buildEntry(addDays(week.startDate, 3), 8, 4),
    ];

    const monthEntries = [
      ...weekEntries,
      buildEntry(addDays(month.startDate, 1), 7, 4),
    ];

    getProjects.mockResolvedValueOnce({
      success: true,
      data: {
        projects: [
          {
            id: 'p1',
            name: 'Library Renovation',
            active: true,
            customers: { name: 'City of Denver' },
          },
          {
            id: 'p2',
            name: 'School Addition',
            active: true,
            customers: { name: 'Jefferson District' },
          },
          {
            id: 'p3',
            name: 'Closed Job',
            active: false,
          },
        ],
      },
    });

    getAllUsers.mockResolvedValueOnce({
      success: true,
      data: {
        users: [
          { id: 1, is_active: true },
          { id: 2, is_active: true },
          { id: 3, is_active: false },
        ],
      },
    });

    getActiveRoster.mockResolvedValueOnce({
      success: true,
      data: {
        roster: [
          { id: 1, is_clocked_in: true },
          { id: 2, is_clocked_in: true },
          { id: 3, is_clocked_in: false },
        ],
      },
    });

    getTimeEntries
      .mockResolvedValueOnce({ success: true, data: weekEntries })
      .mockResolvedValueOnce({ success: true, data: { time_entries: monthEntries } });

    render(<Dashboard />);

    expect(screen.getByText('Loading dashboard...')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeTruthy());

    expect(screen.getByText('Welcome back, Jane Manager 👋')).toBeTruthy();
    expect(screen.getByText('1 completed')).toBeTruthy();
    expect(screen.getByText('3 total')).toBeTruthy();
    expect(screen.getAllByText('7.5h')).toHaveLength(1);
    expect(screen.getByText('11.5h')).toBeTruthy();
    expect(screen.getByText('67% workforce active')).toBeTruthy();

    expect(screen.getByText('Library Renovation')).toBeTruthy();
    expect(screen.getByText('School Addition')).toBeTruthy();
    expect(screen.getByText('City of Denver')).toBeTruthy();
    expect(screen.getByText('Jefferson District')).toBeTruthy();

    expect(getProjects).toHaveBeenCalledWith('token123', 42);
    expect(getAllUsers).toHaveBeenCalledWith('token123', { company_id: 42 });
    expect(getActiveRoster).toHaveBeenCalledWith('token123', 42);
    expect(getTimeEntries).toHaveBeenNthCalledWith(1, 'token123', 42, {
      start_date: week.startStr,
      end_date: week.endStr,
      all_users: 'true',
    });
    expect(getTimeEntries).toHaveBeenNthCalledWith(2, 'token123', 42, {
      start_date: month.startStr,
      end_date: month.endStr,
      all_users: 'true',
    });
  });

  test('resolves company from profile when session metadata is missing and falls back to email name', async () => {
    useSession.mockReturnValue({
      session: {
        access_token: 'tokenABC',
        user: {
          email: 'foreman@example.com',
          user_metadata: {},
        },
      },
    });

    getUserProfile.mockResolvedValueOnce({
      success: true,
      data: { user: { default_company_id: 77 } },
    });

    getProjects.mockResolvedValueOnce({
      success: true,
      data: { projects: [] },
    });
    getAllUsers.mockResolvedValueOnce({ success: true, data: { users: [] } });
    getActiveRoster.mockResolvedValueOnce({ success: true, data: { roster: [] } });
    getTimeEntries.mockResolvedValue({ success: true, data: [] });

    render(<Dashboard />);

    await waitFor(() => expect(getUserProfile).toHaveBeenCalledWith('tokenABC'));
    await waitFor(() => expect(getProjects).toHaveBeenCalledWith('tokenABC', 77));
    await waitFor(() => expect(screen.getByText('Welcome back, foreman 👋')).toBeTruthy());

    expect(screen.getByText('No active projects')).toBeTruthy();
    expect(screen.getByText('Create a project to get started')).toBeTruthy();
    expect(screen.getByText('No team members yet')).toBeTruthy();
  });

  test('pressing an active project navigates to the project overview with an encoded project id', async () => {
    getProjects.mockResolvedValueOnce({
      success: true,
      data: {
        projects: [
          {
            id: 'abc 123',
            name: 'Encoded Project',
            active: true,
            customers: { name: 'ACME' },
          },
        ],
      },
    });

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText('Encoded Project')).toBeTruthy());

    fireEvent.press(screen.getByText('Encoded Project'));

    expect(pushMock).toHaveBeenCalledWith(
      '/(app)/project/projectsOverview?projectId=abc%20123'
    );
  });

  test('quick action buttons route to the expected screens', async () => {
    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText('Quick Actions')).toBeTruthy());

    pushMock.mockClear();

    fireEvent.press(screen.getByText('New Project'));
    fireEvent.press(screen.getByText('Add Employee'));
    fireEvent.press(screen.getByText('View Reports'));
    fireEvent.press(screen.getByText('Timecards'));

    expect(pushMock.mock.calls).toEqual([
      ['/(app)/projects?create=true'],
      ['/(app)/workforce/employees?addNew=true'],
      ['/(app)/reports'],
      ['/(app)/time/timecards'],
    ]);
  });
});