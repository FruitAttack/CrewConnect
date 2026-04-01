import React from 'react';
import { ScrollView } from 'react-native';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';

import Projects from '../../app/(app)/Projects';
import CreateProjectModal from '../../app/components/projectComponents/createProjectModal';

import { getUserProfile, getProjects } from '../../utils/api';
import { useSession } from '../../utils/ctx';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useProject } from '../../app/components/projectComponents/projectContext';

jest.mock('../../utils/api');
jest.mock('../../utils/ctx');
jest.mock('expo-router');
jest.mock('../../app/components/projectComponents/projectContext');

jest.mock('../../app/components/projectComponents/createProjectModal', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return jest.fn((props) =>
    props.visible ? <Text>CREATE_PROJECT_MODAL_OPEN</Text> : null
  );
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('Projects screen', () => {
  let pushMock;
  let setSelectedProjectMock;
  let setSelectedProjectIdMock;

  beforeAll(() => {
    //silence logs in test output
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
    jest.clearAllMocks();

    pushMock = jest.fn();
    setSelectedProjectMock = jest.fn();
    setSelectedProjectIdMock = jest.fn();

    useRouter.mockReturnValue({ push: pushMock });

    useProject.mockReturnValue({
      setSelectedProject: setSelectedProjectMock,
      setSelectedProjectId: setSelectedProjectIdMock,
    });

    useLocalSearchParams.mockReturnValue({});
    useSession.mockReturnValue({ session: { access_token: 'token123' } });
    getUserProfile.mockResolvedValue({
      success: true,
      data: { user: { default_company_id: 1 } },
    });

    getProjects.mockResolvedValue({
      success: true,
      data: { projects: [] },
    });
  });

  test('renders active & inactive projects, sections, and basic card details', async () => {
    getProjects.mockResolvedValueOnce({
      success: true,
      data: {
        projects: [
          {
            id: 'p1',
            name: 'Active Job',
            active: true,
            customer_id: 10,
            customers: { name: 'Acme Co' },
            address: '123 Main St',
            parent: { name: 'Parent Project' },
            geofence_m: 150,
            created_at: '2024-01-01T12:00:00.000Z',
          },
          {
            id: 'p2',
            name: 'Inactive Job',
            active: false,
            customer_id: 20,
            created_at: null,
          },
        ],
      },
    });

    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Active Job')).toBeTruthy());

    // Header counts
    expect(screen.getByText('1 active · 1 inactive')).toBeTruthy();

    // Section headers
    expect(screen.getByText('1 active · 1 inactive')).toBeTruthy();

    // Project names
    expect(screen.getByText('Active Job')).toBeTruthy();
    expect(screen.getByText('Inactive Job')).toBeTruthy();

    // Details for the active card
    expect(screen.getByText('Acme Co')).toBeTruthy();
    expect(screen.getByText('123 Main St')).toBeTruthy();
    expect(screen.getByText('Sub-project of Parent Project')).toBeTruthy();
    expect(screen.getByText('150m geofence')).toBeTruthy();

    // Inactive card with no details falls back to the placeholder
    expect(screen.getByText('No additional details')).toBeTruthy();

    // Verify API calls
    expect(getUserProfile).toHaveBeenCalledWith('token123');
    expect(getProjects).toHaveBeenCalledWith('token123', 1);
  });

  test('pressing a project sets context and navigates with encoded projectId', async () => {
    const project = {
      id: 'abc 123',
      name: 'Encoded Project',
      active: true,
      created_at: null,
    };

    getProjects.mockResolvedValueOnce({
      success: true,
      data: { projects: [project] },
    });

    render(<Projects />);

    await waitFor(() => screen.getByText('Encoded Project'));

    fireEvent.press(screen.getByText('Encoded Project'));

    expect(setSelectedProjectMock).toHaveBeenCalledWith(project);
    expect(setSelectedProjectIdMock).toHaveBeenCalledWith('abc 123');

    // handleProjectPress uses encodeURIComponent
    expect(pushMock).toHaveBeenCalledWith(
      '/(app)/project/projectsOverview?projectId=abc%20123'
    );
  });

  test('when not authenticated (no token), it does not call APIs and shows empty state', async () => {
    useSession.mockReturnValue({ session: null });

    render(<Projects />);

    await waitFor(() => expect(screen.getByText('No projects yet')).toBeTruthy());

    expect(getUserProfile).not.toHaveBeenCalled();
    expect(getProjects).not.toHaveBeenCalled();
    expect(screen.getByText('0 active · 0 inactive')).toBeTruthy();
  });

  test('shows profile error when user has no companyId and does not fetch projects', async () => {
    getUserProfile.mockResolvedValueOnce({
      success: true,
      data: { user: {} },
    });

    render(<Projects />);

    await waitFor(() =>
      expect(screen.getByText('No company associated with this account')).toBeTruthy()
    );

    expect(getProjects).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Retry'));
    expect(getProjects).not.toHaveBeenCalled();
  });

  test('shows projects error and Retry refetches successfully', async () => {
    getProjects
      .mockResolvedValueOnce({ success: false, message: 'Boom' })
      .mockResolvedValueOnce({ success: true, data: { projects: [] } });

    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Boom')).toBeTruthy());

    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => expect(screen.getByText('No projects yet')).toBeTruthy());
    expect(getProjects).toHaveBeenCalledTimes(2);
  });

  test('pressing create button opens the create modal', async () => {
    useSession.mockReturnValue({ session: null });

    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Projects')).toBeTruthy());

    const createButton =
      screen.queryByText('Create New Project') ?? screen.getByText('New');

    fireEvent.press(createButton);

    expect(screen.getByText('CREATE_PROJECT_MODAL_OPEN')).toBeTruthy();
  });

  test('create=true param opens the create modal automatically', async () => {
    useSession.mockReturnValue({ session: null });
    useLocalSearchParams.mockReturnValue({ create: 'true' });

    render(<Projects />);

    await waitFor(() =>
      expect(screen.getByText('CREATE_PROJECT_MODAL_OPEN')).toBeTruthy()
    );
  });

  test('modal onCreated sets context and navigates to overview', async () => {
    useSession.mockReturnValue({ session: null });

    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Projects')).toBeTruthy());

    const calls = CreateProjectModal.mock.calls;
    const modalProps = calls[calls.length - 1][0];

    const newProject = { id: 99, name: 'Brand New', active: true };

    act(() => {
      modalProps.onCreated(newProject);
    });

    expect(setSelectedProjectMock).toHaveBeenCalledWith(newProject);
    expect(setSelectedProjectIdMock).toHaveBeenCalledWith(99);

    expect(pushMock).toHaveBeenCalledWith(
      '/(app)/project/projectsOverview?projectId=99'
    );
  });

  test('toast param shows a toast and auto-dismisses after 3 seconds', async () => {
    jest.useFakeTimers();

    useSession.mockReturnValue({ session: null });
    useLocalSearchParams.mockReturnValue({ toast: 'Project deleted' });

    render(<Projects />);

    await act(async () => {});

    expect(screen.getByText('Project deleted')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Project deleted')).toBeNull();

    jest.useRealTimers();
  });

  test('pull-to-refresh calls getProjects again', async () => {
    getProjects
      .mockResolvedValueOnce({ success: true, data: { projects: [] } })
      .mockResolvedValueOnce({ success: true, data: { projects: [] } });

    const { UNSAFE_getByType } = render(<Projects />);

    await waitFor(() => expect(screen.getByText('No projects yet')).toBeTruthy());
    expect(getProjects).toHaveBeenCalledTimes(1);

    const scroll = UNSAFE_getByType(ScrollView);

    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    expect(getProjects).toHaveBeenCalledTimes(2);
  });
});