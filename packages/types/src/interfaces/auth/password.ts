import { ReactNode } from 'react';
import { AuthErrorCode, AuthErrorAlertType } from '@ever-teams/types';

/**
 * Represents a password validation rule (regex + description).
 */
export interface PasswordValidationCriterion {
	regex: RegExp;
	description: string;
}

/**
 * Defines detailed information for an authentication error.
 */
export interface AuthErrorDetails {
	type: AuthErrorAlertType;
	code: AuthErrorCode;
	title: string;
	message: ReactNode;
}

/**
 * Defines the mapping of error codes to user-facing messages.
 */
export type AuthErrorMessageMap = Record<
	AuthErrorCode,
	{
		title: string;
		message: (email?: string) => ReactNode;
	}
>;
