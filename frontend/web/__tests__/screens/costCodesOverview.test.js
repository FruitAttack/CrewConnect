import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

import CostCodesOverview from '../../app/(app)/project/costCodesOverview';
import { useSession } from '../../utils/ctx';
import { useLocalSearchParams } from 'expo-router';
import { useProject } from '../../app/components/projectComponents/projectContext';
import {
  getAllProjectCostCodes,
  getCostCodes,
  assignCostCodeToProject,
  removeCostCodeFromProject,
  updateProjectCostCodeBudget,
} from '../../utils/api';

jest.mock('../../utils/ctx');
jest.mock('expo-router');
jest.mock('../../app/components/projectComponents/projectContext');
jest.mock('../../utils/api');

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('CostCodesOverview screen', () => {
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
    jest.clearAllMocks();

    useSession.mockReturnValue({
      session: {
        access_token: 'token123',
      },
    });

    useLocalSearchParams.mockReturnValue({});

    useProject.mockReturnValue({
      selectedProject: {
        id: 'project-1',
      },
      selectedProjectId: 'project-1',
    });

    getAllProjectCostCodes.mockResolvedValue({
      success: true,
      data: [],
    });

    getCostCodes.mockResolvedValue({
      success: true,
      data: [],
    });

    assignCostCodeToProject.mockResolvedValue({ success: true });
    removeCostCodeFromProject.mockResolvedValue({ success: true });
    updateProjectCostCodeBudget.mockResolvedValue({ success: true });
  });

  test('shows a no-project-selected state when no project id is available', () => {
    useLocalSearchParams.mockReturnValue({});
    useProject.mockReturnValue({
      selectedProject: null,
      selectedProjectId: null,
    });

    render(<CostCodesOverview />);

    expect(screen.getByText('No project selected')).toBeTruthy();
    expect(getAllProjectCostCodes).not.toHaveBeenCalled();
    expect(getCostCodes).not.toHaveBeenCalled();
  });

  test('loads and renders active and inactive cost codes using the route project id when present', async () => {
    useLocalSearchParams.mockReturnValue({ projectId: 'route-project' });
    useProject.mockReturnValue({
      selectedProject: { id: 'context-project' },
      selectedProjectId: 'context-project',
    });

    getAllProjectCostCodes.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'pc1',
          cost_code_id: 'cc1',
          is_active: true,
          budgeted_hours: 12,
          budgeted_labor_cost: 300,
          budgeted_quantity: 8,
          cost_code: {
            id: 'cc1',
            code: '01-100',
            name: 'Site Prep',
          },
        },
        {
          id: 'pc2',
          cost_code_id: 'cc2',
          is_active: false,
          budgeted_hours: 5,
          budgeted_labor_cost: 125,
          budgeted_quantity: 2,
          cost_code: {
            id: 'cc2',
            code: '02-200',
            name: 'Concrete',
          },
        },
      ],
    });

    getCostCodes.mockResolvedValueOnce({
      success: true,
      data: [
        { id: 'cc1', code: '01-100', name: 'Site Prep' },
        { id: 'cc2', code: '02-200', name: 'Concrete' },
        { id: 'cc3', code: '03-300', name: 'Cleanup' },
      ],
    });

    render(<CostCodesOverview />);

    expect(screen.getByText('Loading cost codes…')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Project Cost Codes')).toBeTruthy());

    expect(getAllProjectCostCodes).toHaveBeenCalledWith('token123', 'route-project');
    expect(getCostCodes).toHaveBeenCalledWith('token123');

    expect(screen.getByText('Active Cost Codes')).toBeTruthy();
    expect(screen.getByText('Inactive Cost Codes')).toBeTruthy();

    expect(screen.getByText('01-100')).toBeTruthy();
    expect(screen.getByText('Site Prep')).toBeTruthy();
    expect(screen.getByText('Hours: 12')).toBeTruthy();
    expect(screen.getByText('Labor: 300')).toBeTruthy();
    expect(screen.getByText('Qty: 8')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();

    expect(screen.getByText('02-200')).toBeTruthy();
    expect(screen.getByText('Concrete')).toBeTruthy();
    expect(screen.getByText('Hours: 5')).toBeTruthy();
    expect(screen.getByText('Labor: 125')).toBeTruthy();
    expect(screen.getByText('Qty: 2')).toBeTruthy();
    expect(screen.getByText('Inactive')).toBeTruthy();
  });

  test('opens the edit modal and saves updated budgets and active state', async () => {
    getAllProjectCostCodes
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'pc1',
            cost_code_id: 'cc1',
            is_active: true,
            budgeted_hours: 12,
            budgeted_labor_cost: 300,
            budgeted_quantity: 8,
            cost_code: {
              id: 'cc1',
              code: '01-100',
              name: 'Site Prep',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'pc1',
            cost_code_id: 'cc1',
            is_active: false,
            budgeted_hours: 20,
            budgeted_labor_cost: 450,
            budgeted_quantity: 10,
            cost_code: {
              id: 'cc1',
              code: '01-100',
              name: 'Site Prep',
            },
          },
        ],
      });

    getCostCodes.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'cc1', code: '01-100', name: 'Site Prep' }],
    });

    render(<CostCodesOverview />);

    await waitFor(() => expect(screen.getByText('Site Prep')).toBeTruthy());

    fireEvent.press(screen.getByText('Site Prep'));

    await waitFor(() => expect(screen.getByText('01-100 — Site Prep')).toBeTruthy());

    const inputs = screen.getAllByDisplayValue(/^(12|300|8)$/);
    fireEvent.changeText(inputs[0], '20');
    fireEvent.changeText(inputs[1], '450');
    fireEvent.changeText(inputs[2], '10');

    fireEvent.press(screen.getAllByText('Active')[1]);
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() =>
      expect(updateProjectCostCodeBudget).toHaveBeenCalledWith(
        'token123',
        'project-1',
        'cc1',
        {
          budgeted_hours: 20,
          budgeted_labor_cost: 450,
          budgeted_quantity: 10,
          is_active: false,
        }
      )
    );

    await waitFor(() => expect(getAllProjectCostCodes).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Inactive')).toBeTruthy();
    expect(screen.getByText('Hours: 20')).toBeTruthy();
    expect(screen.getByText('Labor: 450')).toBeTruthy();
    expect(screen.getByText('Qty: 10')).toBeTruthy();
  });

  test('adds available cost codes in bulk and removes a cost code from the project', async () => {
    getAllProjectCostCodes
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'pc1',
            cost_code_id: 'cc1',
            is_active: true,
            budgeted_hours: 12,
            budgeted_labor_cost: 300,
            budgeted_quantity: 8,
            cost_code: {
              id: 'cc1',
              code: '01-100',
              name: 'Site Prep',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'pc1',
            cost_code_id: 'cc1',
            is_active: true,
            budgeted_hours: 12,
            budgeted_labor_cost: 300,
            budgeted_quantity: 8,
            cost_code: {
              id: 'cc1',
              code: '01-100',
              name: 'Site Prep',
            },
          },
          {
            id: 'pc2',
            cost_code_id: 'cc2',
            is_active: true,
            budgeted_hours: null,
            budgeted_labor_cost: null,
            budgeted_quantity: null,
            cost_code: {
              id: 'cc2',
              code: '02-200',
              name: 'Concrete',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
      success: true,
      data: [
        {
        id: 'pc1',
        cost_code_id: 'cc1',
        is_active: true,
        budgeted_hours: 12,
        budgeted_labor_cost: 300,
        budgeted_quantity: 8,
        cost_code: {
            id: 'cc1',
            code: '01-100',
            name: 'Site Prep',
        },
        },
    ],
    });

    getCostCodes.mockResolvedValueOnce({
      success: true,
      data: [
        { id: 'cc1', code: '01-100', name: 'Site Prep' },
        { id: 'cc2', code: '02-200', name: 'Concrete' },
        { id: 'cc3', code: '03-300', name: 'Cleanup' },
      ],
    });

    render(<CostCodesOverview />);

    await waitFor(() => expect(screen.getByText('Add Cost Code')).toBeTruthy());

    fireEvent.press(screen.getByText('Add Cost Code'));

  await waitFor(() => { expect(screen.getAllByText('Add Cost Codes').length).toBeGreaterThan(0); });
    expect(screen.getByText('02-200')).toBeTruthy();
    expect(screen.getByText('03-300')).toBeTruthy();

    fireEvent.press(screen.getByText('Concrete'));
    fireEvent.press(screen.getByText('Add 1 Cost Code'));

    await waitFor(() =>
      expect(assignCostCodeToProject).toHaveBeenCalledWith('token123', 'project-1', {
        cost_code_id: 'cc2',
      })
    );

    await waitFor(() => expect(screen.getByText('Concrete')).toBeTruthy());
    expect(getAllProjectCostCodes).toHaveBeenCalledTimes(2);

    fireEvent.press(screen.getByText('Concrete'));

    await waitFor(() => expect(screen.getByText('02-200 — Concrete')).toBeTruthy());

    fireEvent.press(screen.getByText('Remove from Project'));

    await waitFor(() => expect(screen.getByText('Remove Cost Code?')).toBeTruthy());

    fireEvent.press(screen.getByText('Remove'));

    await waitFor(() =>
      expect(removeCostCodeFromProject).toHaveBeenCalledWith(
        'token123',
        'project-1',
        'cc2'
      )
    );

    await waitFor(() => expect(getAllProjectCostCodes).toHaveBeenCalledTimes(3));
    expect(screen.queryByText('Concrete')).toBeNull();
    expect(screen.getByText('Site Prep')).toBeTruthy();
  });
});