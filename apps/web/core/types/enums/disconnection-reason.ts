/**
 * Enum for disconnection reasons
 * Used to track and log why a user was disconnected
 */
export enum DisconnectionReason {
  // Valid reasons (only these 2 should disconnect users)
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  USER_LOGOUT = 'USER_LOGOUT',

  // Invalid/suspicious reasons (to investigate)
  UNAUTHORIZED_401 = 'UNAUTHORIZED_401',
  COOKIES_MISSING = 'COOKIES_MISSING',
  TEMPORARY_ERROR = 'TEMPORARY_ERROR',
  UNKNOWN = 'UNKNOWN'
}

