/**
 * PIN storage helpers — kept in a separate module so ProviderLogin.tsx
 * only exports React components, which is required for Vite Fast Refresh.
 */

export function getProviderPinKey(providerId: number): string {
  return `provider_pin_${providerId}`;
}

export function getStoredPinHash(providerId: number): string | null {
  return sessionStorage.getItem(getProviderPinKey(providerId));
}

export function storePinHash(providerId: number, pinHash: string): void {
  sessionStorage.setItem(getProviderPinKey(providerId), pinHash);
}

export function clearPinHash(providerId: number): void {
  sessionStorage.removeItem(getProviderPinKey(providerId));
}
