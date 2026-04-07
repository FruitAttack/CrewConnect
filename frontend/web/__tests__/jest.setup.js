import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('recharts', () => {
  const { View } = require('react-native');

  return {
    BarChart: View,
    Bar: View,
    XAxis: View,
    YAxis: View,
    Tooltip: View,
    ResponsiveContainer: View,
    Cell: View,
    CartesianGrid: View,
    Legend: View,
  };
});

jest.mock('../utils/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    },
  },
}));