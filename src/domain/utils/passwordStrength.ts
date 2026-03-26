export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 6) {
    return 'weak';
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  // Fair: 6-7 chars, or all same character class
  if (password.length < 8) {
    return 'fair';
  }

  // 8+ chars but all one character class
  const classCount = [hasLowercase, hasUppercase, hasDigits, hasSpecial].filter(Boolean).length;
  if (classCount <= 1) {
    return 'fair';
  }

  // Strong: 8+ chars with uppercase, lowercase, digits, AND special char
  if (hasLowercase && hasUppercase && hasDigits && hasSpecial) {
    return 'strong';
  }

  // Good: 8+ chars with mixed classes (but not all four)
  return 'good';
}
