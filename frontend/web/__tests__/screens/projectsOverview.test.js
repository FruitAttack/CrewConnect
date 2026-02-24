import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import ProjectOverview from '../../app/(app)/project/projectsOverview';
import { getProject, updateProject, getCustomers, deleteProject } from '../../utils/api';
import { useSession } from '../../utils/ctx';
import { useProject } from '../../app/components/projectComponents/projectContext';
import { useLocalSearchParams, router } from 'expo-router';

jest.mock('../../utils/api');
jest.mock('../../utils/ctx');
jest.mock('../../app/components/projectComponents/projectContext');

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const TOKEN = 'token123';

const baseProject = {
  id: 'p1',
  name: 'Project Alpha',
  address: '123 Main St',
  active: true,
  company_id: 1,

  customer_id: 10,
  customers: {
    id: 10,
    name: 'Acme Co',
    contact_name: null,
    contact_email: null,
  },

  geofence_m: 150,
  lat: 39.7392,
  lng: -104.9903,
  parent_id: null,
};

const customersList = [
  { id: 10, name: 'Acme Co', contact_name: null, contact_email: null },
  { id: 11, name: 'Beta LLC', contact_name: 'Bob', contact_email: 'bob@beta.com' },
];

describe('ProjectOverview screen', () => {
  let setSelectedProjectMock;

  beforeAll(() => {
    // silence logs from the screen
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

    setSelectedProjectMock = jest.fn();

    useSession.mockReturnValue({ session: { access_token: TOKEN } });

    useLocalSearchParams.mockReturnValue({});

    useProject.mockReturnValue({
      selectedProject: null,
      selectedProjectId: null,
      setSelectedProject: setSelectedProjectMock,
    });

    getProject.mockResolvedValue({
      success: true,
      data: { project: baseProject },
    });

    updateProject.mockResolvedValue({
      success: true,
      data: { project: baseProject },
    });

    getCustomers.mockResolvedValue({
      success: true,
      data: { customers: customersList },
    });

    deleteProject.mockResolvedValue({ success: true });

    router.replace.mockClear();
  });

  test('shows placeholder when no project is selected and no projectId param', async () => {
    render(<ProjectOverview />);

    expect(screen.getByText('Project Overview')).toBeTruthy();
    expect(screen.getByText('No project selected')).toBeTruthy();
    expect(screen.getByText('Open a project from Projects')).toBeTruthy();

    expect(getProject).not.toHaveBeenCalled();
  });

  test('fetches a project when selectedProject is missing but projectId param exists', async () => {
    useLocalSearchParams.mockReturnValue({ projectId: 'p1' });

    useProject.mockReturnValue({
      selectedProject: null,
      selectedProjectId: null,
      setSelectedProject: setSelectedProjectMock,
    });

    getProject.mockResolvedValueOnce({
      success: true,
      data: { project: baseProject },
    });

    render(<ProjectOverview />);

    // Loaded screen has these cards, placeholder does not.
    await waitFor(() => expect(screen.getByText('Core Details')).toBeTruthy());

    expect(getProject).toHaveBeenCalledWith(TOKEN, 'p1');
    expect(setSelectedProjectMock).toHaveBeenCalledWith(baseProject);
    expect(screen.getByText('Edit')).toBeTruthy();
  });

  test('renders from selectedProject without calling getProject', async () => {
    useProject.mockReturnValue({
      selectedProject: baseProject,
      selectedProjectId: baseProject.id,
      setSelectedProject: setSelectedProjectMock,
    });

    render(<ProjectOverview />);

    expect(screen.getByText('Core Details')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();

    expect(getProject).not.toHaveBeenCalled();

    await waitFor(() => expect(getCustomers).toHaveBeenCalledWith(TOKEN, 1));
  });

  test('edit → save success calls updateProject with normalized payload and shows Saved', async () => {
    useProject.mockReturnValue({
      selectedProject: baseProject,
      selectedProjectId: baseProject.id,
      setSelectedProject: setSelectedProjectMock,
    });

    const updated = { ...baseProject, name: 'Project Alpha Updated' };

    updateProject.mockResolvedValueOnce({
      success: true,
      data: { project: updated },
    });

    // onSave refresh fetch
    getProject.mockResolvedValueOnce({
      success: true,
      data: { project: updated },
    });

    render(<ProjectOverview />);

    fireEvent.press(screen.getByText('Edit'));

    // Save should be disabled until something changes, pressing should do nothing
    fireEvent.press(screen.getByText('Save'));
    expect(updateProject).not.toHaveBeenCalled();

    fireEvent.changeText(
      screen.getByPlaceholderText('Project name'),
      '  Project Alpha Updated  '
    );

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(updateProject).toHaveBeenCalledTimes(1));

    expect(updateProject).toHaveBeenCalledWith(
      TOKEN,
      baseProject.id,
      expect.objectContaining({
        name: 'Project Alpha Updated',
        address: '123 Main St',
        customer_id: 10,
        geofence_m: 150,
        lat: 39.7392,
        lng: -104.9903,
        active: true,
        parent_id: null,
      })
    );

    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
    expect(screen.getByText('Edit')).toBeTruthy();

    expect(screen.getAllByText('Project Alpha Updated').length).toBeGreaterThan(0);

    expect(setSelectedProjectMock).toHaveBeenCalled();
  });

  test('edit → cancel discards draft changes and exits editing mode', async () => {
    useProject.mockReturnValue({
      selectedProject: baseProject,
      selectedProjectId: baseProject.id,
      setSelectedProject: setSelectedProjectMock,
    });

    render(<ProjectOverview />);

    fireEvent.press(screen.getByText('Edit'));

    fireEvent.changeText(
      screen.getByPlaceholderText('Project name'),
      'New Draft Name'
    );

    fireEvent.press(screen.getByText('Cancel'));

    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.queryByPlaceholderText('Project name')).toBeNull();

    expect(screen.getAllByText('Project Alpha').length).toBeGreaterThan(0);
    expect(updateProject).not.toHaveBeenCalled();
  });

  test('save failure shows error pill and stays in editing mode', async () => {
    useProject.mockReturnValue({
      selectedProject: baseProject,
      selectedProjectId: baseProject.id,
      setSelectedProject: setSelectedProjectMock,
    });

    updateProject.mockResolvedValueOnce({
      success: false,
      message: 'Failed to save project',
    });

    render(<ProjectOverview />);

    fireEvent.press(screen.getByText('Edit'));
    fireEvent.changeText(screen.getByPlaceholderText('Project name'), 'Changed');

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() =>
      expect(screen.getByText('Failed to save project')).toBeTruthy()
    );

    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  test('customer dropdown selection changes customer_id in update payload', async () => {
    useProject.mockReturnValue({
      selectedProject: baseProject,
      selectedProjectId: baseProject.id,
      setSelectedProject: setSelectedProjectMock,
    });

    const updated = {
      ...baseProject,
      customer_id: 11,
      customers: { id: 11, name: 'Beta LLC', contact_name: 'Bob', contact_email: 'bob@beta.com' },
    };

    updateProject.mockResolvedValueOnce({
      success: true,
      data: { project: updated },
    });

    getProject.mockResolvedValueOnce({
      success: true,
      data: { project: updated },
    });

    render(<ProjectOverview />);

    fireEvent.press(screen.getByText('Edit'));

    // Open dropdown
    const triggerText =
      screen.queryByText('Acme Co') ?? screen.getByText('No customer');

    fireEvent.press(triggerText);

    // wait until customers load into the dropdown menu
    await waitFor(() => expect(screen.getByText('Beta LLC')).toBeTruthy());

    fireEvent.press(screen.getByText('Beta LLC'));

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(updateProject).toHaveBeenCalledTimes(1));

    expect(updateProject).toHaveBeenCalledWith(
      TOKEN,
      baseProject.id,
      expect.objectContaining({
        customer_id: 11,
      })
    );

    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
  });

  test('delete success calls deleteProject, clears selectedProject, and router.replace to projects with toast', async () => {
    useProject.mockReturnValue({
      selectedProject: baseProject,
      selectedProjectId: baseProject.id,
      setSelectedProject: setSelectedProjectMock,
    });

    deleteProject.mockResolvedValueOnce({ success: true });

    render(<ProjectOverview />);

    fireEvent.press(screen.getByText('Edit'));

    fireEvent.press(screen.getByText('Delete Project'));

    // delete confirmation modal
    expect(screen.getByText('Delete Project?')).toBeTruthy();

    fireEvent.press(screen.getByText('Delete'));

    await waitFor(() =>
      expect(deleteProject).toHaveBeenCalledWith(TOKEN, baseProject.id, true)
    );

    expect(setSelectedProjectMock).toHaveBeenCalledWith(null);

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/(app)/projects',
      params: {
        toast: `"${baseProject.name}" was successfully deleted`,
      },
    });
  });

  test('delete failure with time_entries shows custom deletion error modal message', async () => {
    useProject.mockReturnValue({
      selectedProject: baseProject,
      selectedProjectId: baseProject.id,
      setSelectedProject: setSelectedProjectMock,
    });

    deleteProject.mockResolvedValueOnce({
      success: false,
      message: 'violates foreign key constraint on time_entries',
    });

    render(<ProjectOverview />);

    fireEvent.press(screen.getByText('Edit'));
    fireEvent.press(screen.getByText('Delete Project'));
    fireEvent.press(screen.getByText('Delete'));

    await waitFor(() => expect(screen.getByText('Deletion Failed')).toBeTruthy());

    expect(
      screen.getByText(
        'This project cannot be permanently deleted because it has time entries associated with it. You can archive it instead.'
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByText('OK'));
    expect(screen.queryByText('Deletion Failed')).toBeNull();
  });
});