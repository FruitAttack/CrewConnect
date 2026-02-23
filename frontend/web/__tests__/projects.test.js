import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import Projects from '../app/(app)/Projects';
import { getUserProfile, getProjects } from '../utils/api';
import { useSession } from '../utils/ctx';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useProject } from '../app/components/projectComponents/projectContext';

jest.mock('../utils/api');
jest.mock('../utils/ctx');
jest.mock('expo-router');
jest.mock('../app/components/projectComponents/projectContext');

test('renders active and inactive projects correctly', async () => {
  useSession.mockReturnValue({
    session: { access_token: 'token123' }
  });

  useRouter.mockReturnValue({ push: jest.fn() });

  useLocalSearchParams.mockReturnValue({});

  useProject.mockReturnValue({
    setSelectedProject: jest.fn(),
    setSelectedProjectID: jest.fn()
  });

  getUserProfile.mockResolvedValue({
    success: true,
    data: { user: { default_company_id: 1 } }
  });

  getProjects.mockResolvedValue({
    success: true,
    data: {
      projects: [
        { id: 1, name: 'Active Job', active: true, created_at: '2024-01-01' },
        { id: 2, name: 'Inactive Job', active: false, created_at: '2024-01-01' }
      ]
    }
  });

  render(<Projects />);

  await waitFor(() => {
    expect(screen.getByText('Active Job')).toBeTruthy();
  });

  expect(screen.getByText('Inactive Job')).toBeTruthy();
  expect(screen.getByText('1 active · 1 inactive')).toBeTruthy();
});

test('pressing a project navigates correctly', async () => {
  const pushMock = jest.fn();
  const setSelectedProjectMock = jest.fn();
  const setSelectedProjectIDMock = jest.fn();

  useSession.mockReturnValue({
    session: { access_token: 'token123' }
  });

  useRouter.mockReturnValue({ push: pushMock });

  useLocalSearchParams.mockReturnValue({});

  useProject.mockReturnValue({
    setSelectedProject: setSelectedProjectMock,
    setSelectedProjectID: setSelectedProjectIDMock
  });

  getUserProfile.mockResolvedValue({
    success: true,
    data: { user: { default_company_id: 1 } }
  });

  getProjects.mockResolvedValue({
    success: true,
    data: {
      projects: [
        { id: 1, name: 'Active Job', active: true, created_at: '2024-01-01' }
      ]
    }
  });

  render(<Projects />);

  await waitFor(() => screen.getByText('Active Job'));

  fireEvent.press(screen.getByText('Active Job'));

  expect(setSelectedProjectMock).toHaveBeenCalled();
  expect(setSelectedProjectIDMock).toHaveBeenCalledWith(1);
  expect(pushMock).toHaveBeenCalledWith(
    '/(app)/project/projectsOverview?projectId=1'
  );
});