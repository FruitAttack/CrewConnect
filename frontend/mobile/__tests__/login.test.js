import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginPage from '../app/login';
import { router } from 'expo-router';
import { useSession } from '../utils/ctx';

// Mock dependencies
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock('../utils/ctx', () => ({
  useSession: jest.fn(),
}));

jest.mock('../utils/api', () => ({
  apiCall: jest.fn(),
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

describe('LoginPage', () => {
  const mockSignIn = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    useSession.mockReturnValue({
      signIn: mockSignIn,
      isLoading: false,
    });
    
    // Clear environment variables
    delete process.env.EXPO_PUBLIC_DEBUG_MODE;
    delete process.env.EXPO_PUBLIC_USER;
    delete process.env.EXPO_PUBLIC_PASSWORD;
  });

  describe('Rendering', () => {
    it('should render all main components', () => {
      const { getByText, getByPlaceholderText } = render(<LoginPage />);
      
      expect(getByText('Crew Connect')).toBeTruthy();
      expect(getByText('Email')).toBeTruthy();
      expect(getByText('Password')).toBeTruthy();
      expect(getByPlaceholderText('johndoe@example.com')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByText('Login')).toBeTruthy();
    });

    it('should render the logo', () => {
      const { getByTestId, UNSAFE_getByType } = render(<LoginPage />);
      const images = UNSAFE_getByType('Image');
      expect(images).toBeTruthy();
    });
  });

  describe('Debug Mode Auto-fill', () => {
    it('should auto-fill credentials when debug mode is enabled', () => {
      process.env.EXPO_PUBLIC_DEBUG_MODE = 'true';
      process.env.EXPO_PUBLIC_USER = 'test@example.com';
      process.env.EXPO_PUBLIC_PASSWORD = 'testpassword';

      const { getByPlaceholderText } = render(<LoginPage />);
      
      const emailInput = getByPlaceholderText('johndoe@example.com');
      const passwordInput = getByPlaceholderText('Password');

      expect(emailInput.props.value).toBe('test@example.com');
      expect(passwordInput.props.value).toBe('testpassword');
    });

    it('should not auto-fill when debug mode is disabled', () => {
      process.env.EXPO_PUBLIC_DEBUG_MODE = 'false';
      process.env.EXPO_PUBLIC_USER = 'test@example.com';
      process.env.EXPO_PUBLIC_PASSWORD = 'testpassword';

      const { getByPlaceholderText } = render(<LoginPage />);
      
      const emailInput = getByPlaceholderText('johndoe@example.com');
      const passwordInput = getByPlaceholderText('Password');

      expect(emailInput.props.value).toBe('');
      expect(passwordInput.props.value).toBe('');
    });
  });

  describe('User Input', () => {
    it('should update email when user types', () => {
      const { getByPlaceholderText } = render(<LoginPage />);
      const emailInput = getByPlaceholderText('johndoe@example.com');
      
      fireEvent.changeText(emailInput, 'user@test.com');
      
      expect(emailInput.props.value).toBe('user@test.com');
    });

    it('should update password when user types', () => {
      const { getByPlaceholderText } = render(<LoginPage />);
      const passwordInput = getByPlaceholderText('Password');
      
      fireEvent.changeText(passwordInput, 'mypassword123');
      
      expect(passwordInput.props.value).toBe('mypassword123');
    });
  });

  describe('Login Functionality', () => {
    it('should call signIn with email and password when login button is pressed', async () => {
      mockSignIn.mockResolvedValue({ token: 'test-token' });
      
      const { getByPlaceholderText, getByText } = render(<LoginPage />);
      
      const emailInput = getByPlaceholderText('johndoe@example.com');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Login');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should navigate to clockin_home on successful login', async () => {
      mockSignIn.mockResolvedValue({ token: 'test-token' });
      
      const { getByPlaceholderText, getByText } = render(<LoginPage />);
      
      const emailInput = getByPlaceholderText('johndoe@example.com');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Login');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/(clockin_Screen)/clockin_home');
      });
    });

    it('should display error message when signIn returns null', async () => {
      mockSignIn.mockResolvedValue(null);
      
      const { getByPlaceholderText, getByText } = render(<LoginPage />);
      
      const emailInput = getByPlaceholderText('johndoe@example.com');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Login');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(getByText('Login failed. No session returned.')).toBeTruthy();
      });
      
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('should display error message when signIn throws an error', async () => {
      const errorMessage = 'Invalid credentials';
      mockSignIn.mockRejectedValue(new Error(errorMessage));
      
      const { getByPlaceholderText, getByText } = render(<LoginPage />);
      
      const emailInput = getByPlaceholderText('johndoe@example.com');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Login');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(getByText(errorMessage)).toBeTruthy();
      });
    });

    it('should clear previous error when attempting new login', async () => {
      mockSignIn.mockRejectedValueOnce(new Error('First error'));
      
      const { getByPlaceholderText, getByText, queryByText } = render(<LoginPage />);
      
      const loginButton = getByText('Login');
      
      // First failed login
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(getByText('First error')).toBeTruthy();
      });
      
      // Second login attempt
      mockSignIn.mockResolvedValue({ token: 'test-token' });
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(queryByText('First error')).toBeNull();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable inputs and button when isLoading is true', () => {
      useSession.mockReturnValue({
        signIn: mockSignIn,
        isLoading: true,
      });
      
      const { getByPlaceholderText, getByText } = render(<LoginPage />);
      
      const emailInput = getByPlaceholderText('johndoe@example.com');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Logging in...');
      
      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
      expect(loginButton).toBeTruthy();
    });

    it('should show "Logging in..." text when isLoading is true', () => {
      useSession.mockReturnValue({
        signIn: mockSignIn,
        isLoading: true,
      });
      
      const { getByText } = render(<LoginPage />);
      
      expect(getByText('Logging in...')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should not render forgot password action in current login UI', () => {
      const { queryByText } = render(<LoginPage />);

      expect(queryByText('Forgot Password?')).toBeNull();
    });
  });

  describe('Input Properties', () => {
    it('should have correct keyboard type for email input', () => {
      const { getByPlaceholderText } = render(<LoginPage />);
      const emailInput = getByPlaceholderText('johndoe@example.com');
      
      expect(emailInput.props.keyboardType).toBe('email-address');
    });

    it('should have autoCapitalize none for email input', () => {
      const { getByPlaceholderText } = render(<LoginPage />);
      const emailInput = getByPlaceholderText('johndoe@example.com');
      
      expect(emailInput.props.autoCapitalize).toBe('none');
    });

    it('should have secureTextEntry for password input', () => {
      const { getByPlaceholderText } = render(<LoginPage />);
      const passwordInput = getByPlaceholderText('Password');
      
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });
  });
});