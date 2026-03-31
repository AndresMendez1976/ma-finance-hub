export function validatePasswordPolicy(password: string, email?: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  if (email && password.toLowerCase() === email.toLowerCase()) return 'Password cannot be the same as your email';
  return null;
}
