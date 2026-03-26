import auth from '@react-native-firebase/auth';

export type FirebaseUser = ReturnType<typeof auth>['currentUser'];

// Firebase error code → user-friendly message mapping
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/weak-password': 'Password must be at least 6 characters',
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Incorrect password',
  'auth/invalid-credential': 'Incorrect email or password',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
  'auth/network-request-failed': 'Network error. Check your connection',
  'auth/user-disabled': 'This account has been disabled',
  'auth/requires-recent-login': 'Please sign in again to continue',
  'auth/account-exists-with-different-credential': 'An account with this email already exists. Try signing in with your password instead.',
};

function getAuthErrorMessage(error: any): string {
  const code = error?.code as string | undefined;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  return error?.message || 'An unexpected error occurred';
}

export const authService = {
  getCurrentUser(): FirebaseUser {
    return auth().currentUser;
  },

  onAuthStateChanged(callback: (user: FirebaseUser) => void) {
    return auth().onAuthStateChanged(callback);
  },

  async signUp(email: string, password: string, displayName?: string) {
    try {
      const credential = await auth().createUserWithEmailAndPassword(email, password);
      if (displayName && credential.user) {
        await credential.user.updateProfile({ displayName });
        // Force-refresh token so the 'name' claim is included
        // in subsequent API calls (e.g. GET /auth/me auto-provision)
        await credential.user.getIdToken(true);
      }
      return credential.user;
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async signIn(email: string, password: string) {
    try {
      const credential = await auth().signInWithEmailAndPassword(email, password);
      return credential.user;
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async signOut() {
    try {
      await auth().signOut();
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async resetPassword(email: string) {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async reauthenticate(email: string, password: string) {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('Session expired. Please sign in again.');
    }
    try {
      const credential = auth.EmailAuthProvider.credential(email, password);
      await currentUser.reauthenticateWithCredential(credential);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async updatePassword(newPassword: string) {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('Session expired. Please sign in again.');
    }
    try {
      await currentUser.updatePassword(newPassword);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async verifyBeforeUpdateEmail(newEmail: string) {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('Session expired. Please sign in again.');
    }
    try {
      await currentUser.verifyBeforeUpdateEmail(newEmail);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async reauthenticateWithGoogle() {
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: '90568619662-eligsumphengdqd37tf9s9j2keeu963c.apps.googleusercontent.com',
      });
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult?.data?.idToken;
      if (!idToken) throw new Error('No ID token from Google');
      const credential = auth.GoogleAuthProvider.credential(idToken);
      const user = auth().currentUser;
      if (!user) throw new Error('Session expired. Please sign in again.');
      await user.reauthenticateWithCredential(credential);
    } catch (error: any) {
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501') {
        throw new Error('Cancelled');
      }
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async reauthenticateWithApple() {
    try {
      const { appleAuth } = require('@invertase/react-native-apple-authentication');
      const appleCredential = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      if (!appleCredential.identityToken) throw new Error('No identity token from Apple');
      const credential = auth.AppleAuthProvider.credential(
        appleCredential.identityToken,
        appleCredential.nonce
      );
      const user = auth().currentUser;
      if (!user) throw new Error('Session expired. Please sign in again.');
      await user.reauthenticateWithCredential(credential);
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED' || error?.code === '1001') {
        throw new Error('Cancelled');
      }
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async signInWithGoogle() {
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: '90568619662-eligsumphengdqd37tf9s9j2keeu963c.apps.googleusercontent.com',
      });
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult?.data?.idToken;
      if (!idToken) throw new Error('No ID token from Google');
      const credential = auth.GoogleAuthProvider.credential(idToken);
      const result = await auth().signInWithCredential(credential);
      return { cancelled: false, user: result.user };
    } catch (error: any) {
      // User cancelled
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501') {
        return { cancelled: true, user: null };
      }
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async signInWithApple() {
    try {
      const { appleAuth } = require('@invertase/react-native-apple-authentication');
      const appleCredential = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      if (!appleCredential.identityToken) throw new Error('No identity token from Apple');
      const credential = auth.AppleAuthProvider.credential(
        appleCredential.identityToken,
        appleCredential.nonce
      );
      const result = await auth().signInWithCredential(credential);
      return { cancelled: false, user: result.user };
    } catch (error: any) {
      // User cancelled
      if (error?.code === 'ERR_REQUEST_CANCELED' || error?.code === '1001') {
        return { cancelled: true, user: null };
      }
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async sendVerificationEmail() {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error('Session expired. Please sign in again.');
      await user.sendEmailVerification();
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async checkEmailVerified(): Promise<boolean> {
    const user = auth().currentUser;
    if (!user) return false;
    await user.reload();
    return auth().currentUser?.emailVerified ?? false;
  },

  async getIdToken(forceRefresh = false): Promise<string | null> {
    const user = auth().currentUser;
    if (!user) return null;
    return user.getIdToken(forceRefresh);
  },
};
