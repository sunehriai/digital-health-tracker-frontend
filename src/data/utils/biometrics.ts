import * as LocalAuthentication from 'expo-local-authentication';

export const biometrics = {
  /** Check if device has biometric hardware */
  async isAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  },

  /** Get supported biometric types (fingerprint, face, iris) */
  async supportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  },

  /** Prompt user for biometric authentication */
  async authenticate(promptMessage = 'Authenticate to access'): Promise<{ success: boolean; error?: string }> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use passcode',
    });

    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error || 'Authentication failed' };
  },
};
