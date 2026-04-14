import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Support from '../../app/support';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('Support Docs Page', () => {
  it('renders docs shell and quick start by default', () => {
    const { getAllByText, getByPlaceholderText } = render(<Support />);

    expect(getAllByText('Docs').length).toBeGreaterThan(0);
    expect(getByPlaceholderText('Search docs...')).toBeTruthy();
    expect(getAllByText('Quick start').length).toBeGreaterThan(0);
    expect(getAllByText('Create your Company').length).toBeGreaterThan(0);
  });

  it('shows both navigation entries', () => {
    const { getAllByText } = render(<Support />);

    expect(getAllByText('GETTING STARTED').length).toBeGreaterThan(0);
    expect(getAllByText('DOWNLOADS').length).toBeGreaterThan(0);
    expect(getAllByText('Quick start').length).toBeGreaterThan(0);
    expect(getAllByText('Download the app').length).toBeGreaterThan(0);
  });

  it('navigates to download page when sidebar item is pressed', () => {
    const { getByText } = render(<Support />);

    fireEvent.press(getByText('Download the app'));

    expect(getByText('Get CrewConnect on your device and start tracking in minutes.')).toBeTruthy();
    expect(getByText('How to install')).toBeTruthy();
    expect(getByText('Download and install')).toBeTruthy();
    expect(getByText('Get it the app')).toBeTruthy();
  });

  it('allows typing in docs search field', () => {
    const { getByPlaceholderText } = render(<Support />);

    const searchInput = getByPlaceholderText('Search docs...');
    fireEvent.changeText(searchInput, 'download');

    expect(searchInput.props.value).toBe('download');
  });

  it('filters nav items by search text', () => {
    const { getByPlaceholderText, getByText } = render(<Support />);

    fireEvent.changeText(getByPlaceholderText('Search docs...'), 'download');

    expect(getByText('Download the app')).toBeTruthy();
  });
});
