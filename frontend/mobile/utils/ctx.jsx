import { use, createContext } from 'react';
import { useStorageState } from './useStorageState';

const AuthContext = createContext({
  signIn: () => null,
  signOut: () => null,
  session: null,
  isLoading: false,
});

// Use this hook to access the user info.
export function useSession() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }

  return value;
}

export function SessionProvider({ children }) {
  const [[isLoading, session], setSession] = useStorageState('session');

  return (
    <AuthContext.Provider
      value={{
        signIn: (token, username) => {
          const sessionData = JSON.stringify({
            token,
            username,
          });

          setSession(sessionData);
        },

        signOut: () => {
          setSession(null);
        },

        session: session,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
