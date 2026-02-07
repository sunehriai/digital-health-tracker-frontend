// TODO: Re-enable Firebase auth imports when config files are added
// import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type FirebaseUser = any;

// Stubbed auth service — Firebase is temporarily disabled for development
export const authService = {
  getCurrentUser(): FirebaseUser | null {
    return null;
  },

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    callback(null);
    return () => {};
  },

  async signUp(_email: string, _password: string, _displayName?: string) {
    return null as any;
  },

  async signIn(_email: string, _password: string) {
    return null as any;
  },

  async signOut() {},

  async resetPassword(_email: string) {},

  async getIdToken(): Promise<string | null> {
    return null;
  },
};
