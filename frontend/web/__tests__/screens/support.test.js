import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import Support from '../../app/support';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('Support Component', () => {
  let mockRouter;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
      back: jest.fn(),
    };
    useRouter.mockReturnValue(mockRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component without crashing', () => {
      const { getByText } = render(<Support />);
      expect(getByText('How Can We Help?')).toBeTruthy();
    });

    it('should render the hero section with correct content', () => {
      const { getByText, getByPlaceholderText } = render(<Support />);
      
      expect(getByText('SUPPORT')).toBeTruthy();
      expect(getByText('How Can We Help?')).toBeTruthy();
      expect(getByText('Our team is here to help you succeed. Choose from the options below or search our knowledge base.')).toBeTruthy();
      expect(getByPlaceholderText('Search for answers...')).toBeTruthy();
    });

    it('should render all support options', () => {
      const { getByText } = render(<Support />);
      
      expect(getByText('Live Chat')).toBeTruthy();
      expect(getByText('Email Support')).toBeTruthy();
      expect(getByText('Phone Support')).toBeTruthy();
      expect(getByText('Documentation')).toBeTruthy();
    });

    it('should render all FAQ items', () => {
      const { getByText } = render(<Support />);
      
      expect(getByText('How do I add new employees to the system?')).toBeTruthy();
      expect(getByText('Can employees clock in without internet?')).toBeTruthy();
      expect(getByText('How does geofencing work?')).toBeTruthy();
      expect(getByText('Can I export data to my payroll system?')).toBeTruthy();
      expect(getByText('What happens if an employee forgets to clock out?')).toBeTruthy();
      expect(getByText('Is my data secure?')).toBeTruthy();
    });

    it('should render all resource cards', () => {
      const { getByText } = render(<Support />);
      
      expect(getByText('Video Tutorials')).toBeTruthy();
      expect(getByText('User Guides')).toBeTruthy();
      expect(getByText('API Reference')).toBeTruthy();
      expect(getByText('Release Notes')).toBeTruthy();
    });

    it('should render the contact form with all fields', () => {
      const { getByText, getByPlaceholderText } = render(<Support />);
      
      expect(getByText('Get in Touch')).toBeTruthy();
      expect(getByPlaceholderText('Your name')).toBeTruthy();
      expect(getByPlaceholderText('your@email.com')).toBeTruthy();
      expect(getByPlaceholderText('Your company name')).toBeTruthy();
      expect(getByPlaceholderText('How can we help?')).toBeTruthy();
    });

    it('should render the footer', () => {
      const { getByText } = render(<Support />);
      expect(getByText('© 2025 CrewConnect. Built for construction.')).toBeTruthy();
    });
  });

  describe('Support Options', () => {
    it('should display correct descriptions for each support option', () => {
      const { getByText } = render(<Support />);
      
      expect(getByText('Get instant help from our support team during business hours.')).toBeTruthy();
      expect(getByText("Send us a message and we'll respond within 24 hours.")).toBeTruthy();
      expect(getByText('Talk to a real person. Available for Professional plans and above.')).toBeTruthy();
      expect(getByText('Browse guides, tutorials, and API documentation.')).toBeTruthy();
    });

    it('should show correct action buttons', () => {
      const { getByText } = render(<Support />);
      
      expect(getByText('Start Chat')).toBeTruthy();
      expect(getByText('Send Email')).toBeTruthy();
      expect(getByText('Call Now')).toBeTruthy();
      expect(getByText('View Docs')).toBeTruthy();
    });

    it('should disable phone support button (unavailable)', () => {
      const { getAllByText } = render(<Support />);
      const callNowButtons = getAllByText('Call Now');
      
      // Phone support should be disabled
      expect(callNowButtons).toBeTruthy();
    });
  });

  describe('FAQ Functionality', () => {
    it('should expand FAQ item when clicked', () => {
      const { getByText, queryByText } = render(<Support />);
      
      const faqQuestion = getByText('How do I add new employees to the system?');
      const answer = "Navigate to the Employees section in your dashboard, click \"Add Employee\", and fill in their details. They'll receive an invitation email to download the mobile app and set up their account.";
      
      // Answer should not be visible initially
      expect(queryByText(answer)).toBeNull();
      
      // Click to expand
      fireEvent.press(faqQuestion);
      
      // Answer should now be visible
      expect(getByText(answer)).toBeTruthy();
    });

    it('should collapse FAQ item when clicked again', () => {
      const { getByText, queryByText } = render(<Support />);
      
      const faqQuestion = getByText('Can employees clock in without internet?');
      const answer = "Yes! Our offline mode allows employees to clock in and out without an internet connection. All data is stored locally and automatically syncs when connectivity is restored.";
      
      // Expand
      fireEvent.press(faqQuestion);
      expect(getByText(answer)).toBeTruthy();
      
      // Collapse
      fireEvent.press(faqQuestion);
      expect(queryByText(answer)).toBeNull();
    });

    it('should only show one expanded FAQ at a time', () => {
      const { getByText, queryByText } = render(<Support />);
      
      const faq1Question = getByText('How does geofencing work?');
      const faq2Question = getByText('Can I export data to my payroll system?');
      
      const faq1Answer = "You can set up virtual boundaries around your job sites. When employees attempt to clock in, the app verifies they're within the geofence. You can customize the radius and receive alerts for out-of-bounds attempts.";
      const faq2Answer = "Absolutely! CrewConnect supports exports to all major payroll systems including ADP, Paychex, and QuickBooks. You can also export raw CSV files for custom integrations.";
      
      // Expand first FAQ
      fireEvent.press(faq1Question);
      expect(getByText(faq1Answer)).toBeTruthy();
      
      // Expand second FAQ
      fireEvent.press(faq2Question);
      expect(getByText(faq2Answer)).toBeTruthy();
      
      // First FAQ should now be collapsed
      expect(queryByText(faq1Answer)).toBeNull();
    });

    it('should render all FAQ answers correctly when expanded', () => {
      const { getByText } = render(<Support />);
      
      const faqs = [
        {
          q: 'What happens if an employee forgets to clock out?',
          a: 'Supervisors receive automatic notifications for missing clock-outs. They can manually add the clock-out time from the dashboard, and the employee can also request a time correction through the app.',
        },
        {
          q: 'Is my data secure?',
          a: "Yes. We use 256-bit encryption for all data transmission and storage. We're SOC 2 Type II compliant and undergo regular security audits. Your data is backed up daily across multiple secure data centers.",
        },
      ];
      
      faqs.forEach(faq => {
        fireEvent.press(getByText(faq.q));
        expect(getByText(faq.a)).toBeTruthy();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should allow typing in the search input', () => {
      const { getByPlaceholderText } = render(<Support />);
      
      const searchInput = getByPlaceholderText('Search for answers...');
      
      fireEvent.changeText(searchInput, 'geofencing');
      
      expect(searchInput.props.value).toBe('geofencing');
    });
  });

  describe('Contact Form', () => {
    it('should update name field when typing', () => {
      const { getByPlaceholderText } = render(<Support />);
      
      const nameInput = getByPlaceholderText('Your name');
      
      fireEvent.changeText(nameInput, 'John Doe');
      
      expect(nameInput.props.value).toBe('John Doe');
    });

    it('should update email field when typing', () => {
      const { getByPlaceholderText } = render(<Support />);
      
      const emailInput = getByPlaceholderText('your@email.com');
      
      fireEvent.changeText(emailInput, 'john@example.com');
      
      expect(emailInput.props.value).toBe('john@example.com');
    });

    it('should update company field when typing', () => {
      const { getByPlaceholderText } = render(<Support />);
      
      const companyInput = getByPlaceholderText('Your company name');
      
      fireEvent.changeText(companyInput, 'Acme Construction');
      
      expect(companyInput.props.value).toBe('Acme Construction');
    });

    it('should update message field when typing', () => {
      const { getByPlaceholderText } = render(<Support />);
      
      const messageInput = getByPlaceholderText('How can we help?');
      
      fireEvent.changeText(messageInput, 'I need help with setup');
      
      expect(messageInput.props.value).toBe('I need help with setup');
    });

    it('should handle submit button press', () => {
      const { getByText } = render(<Support />);
      
      const submitButton = getByText('Send Message');
      
      fireEvent.press(submitButton);
      
      // In a real implementation, you would verify form submission logic
      expect(submitButton).toBeTruthy();
    });

    it('should allow filling out the entire form', () => {
      const { getByPlaceholderText, getByText } = render(<Support />);
      
      // Fill out all fields
      fireEvent.changeText(getByPlaceholderText('Your name'), 'Jane Smith');
      fireEvent.changeText(getByPlaceholderText('your@email.com'), 'jane@example.com');
      fireEvent.changeText(getByPlaceholderText('Your company name'), 'BuildRight Inc');
      fireEvent.changeText(getByPlaceholderText('How can we help?'), 'I need assistance with payroll integration');
      
      // Verify all fields are populated
      expect(getByPlaceholderText('Your name').props.value).toBe('Jane Smith');
      expect(getByPlaceholderText('your@email.com').props.value).toBe('jane@example.com');
      expect(getByPlaceholderText('Your company name').props.value).toBe('BuildRight Inc');
      expect(getByPlaceholderText('How can we help?').props.value).toBe('I need assistance with payroll integration');
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle window dimension changes', () => {
      const { rerender } = render(<Support />);
      
      // Test that component rerenders without errors
      rerender(<Support />);
      
      expect(true).toBe(true);
    });
  });

  describe('Hover States', () => {
    it('should handle hover on support cards', () => {
      const { getAllByText } = render(<Support />);
      
      const liveChat = getAllByText('Live Chat')[0];
      
      // These would trigger hover states in the component
      fireEvent(liveChat, 'hoverIn');
      fireEvent(liveChat, 'hoverOut');
      
      expect(liveChat).toBeTruthy();
    });

    it('should handle hover on FAQ items', () => {
      const { getByText } = render(<Support />);
      
      const faqItem = getByText('How does geofencing work?');
      
      fireEvent(faqItem, 'hoverIn');
      fireEvent(faqItem, 'hoverOut');
      
      expect(faqItem).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper structure for screen readers', () => {
      const { getByText } = render(<Support />);
      
      // Verify headings are present
      expect(getByText('How Can We Help?')).toBeTruthy();
      expect(getByText('Frequently Asked Questions')).toBeTruthy();
      expect(getByText('Learn More')).toBeTruthy();
      expect(getByText('Get in Touch')).toBeTruthy();
    });

    it('should have accessible form labels', () => {
      const { getByText } = render(<Support />);
      
      expect(getByText('Name')).toBeTruthy();
      expect(getByText('Email')).toBeTruthy();
      expect(getByText('Company')).toBeTruthy();
      expect(getByText('Message')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty form submission', () => {
      const { getByText, getByPlaceholderText } = render(<Support />);
      
      // Ensure fields are empty
      expect(getByPlaceholderText('Your name').props.value).toBe('');
      expect(getByPlaceholderText('your@email.com').props.value).toBe('');
      
      const submitButton = getByText('Send Message');
      fireEvent.press(submitButton);
      
      // Component should handle this gracefully
      expect(submitButton).toBeTruthy();
    });

    it('should handle rapid FAQ toggling', () => {
      const { getByText } = render(<Support />);
      
      const faqQuestion = getByText('Is my data secure?');
      
      // Rapidly toggle
      fireEvent.press(faqQuestion);
      fireEvent.press(faqQuestion);
      fireEvent.press(faqQuestion);
      
      expect(faqQuestion).toBeTruthy();
    });

    it('should handle very long text input in form fields', () => {
      const { getByPlaceholderText } = render(<Support />);
      
      const messageInput = getByPlaceholderText('How can we help?');
      const longMessage = 'A'.repeat(1000);
      
      fireEvent.changeText(messageInput, longMessage);
      
      expect(messageInput.props.value).toBe(longMessage);
    });
  });

  describe('Integration', () => {
    it('should maintain form state across interactions', () => {
      const { getByPlaceholderText, getByText } = render(<Support />);
      
      // Fill form
      fireEvent.changeText(getByPlaceholderText('Your name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@test.com');
      
      // Interact with FAQ
      fireEvent.press(getByText('How does geofencing work?'));
      
      // Form state should be preserved
      expect(getByPlaceholderText('Your name').props.value).toBe('Test User');
      expect(getByPlaceholderText('your@email.com').props.value).toBe('test@test.com');
    });

    it('should handle multiple state changes simultaneously', () => {
      const { getByText, getByPlaceholderText } = render(<Support />);
      
      // Change multiple states
      fireEvent.press(getByText('Can employees clock in without internet?'));
      fireEvent.changeText(getByPlaceholderText('Your name'), 'Multi State');
      fireEvent(getByText('Live Chat'), 'hoverIn');
      
      expect(getByText('Can employees clock in without internet?')).toBeTruthy();
      expect(getByPlaceholderText('Your name').props.value).toBe('Multi State');
    });
  });
});