'use client';

import { useProactiveTokenRefresh } from '@/core/hooks/auth/use-proactive-token-refresh';

/**
 * Provider component for proactive token refresh
 * 
 * This component wraps the useProactiveTokenRefresh hook to ensure
 * it runs on the client side and keeps the user's session alive.
 * 
 * WORKAROUND FOR: Ever-Gauzy refresh token rotation bug
 * TODO: Remove this provider once Ever-Gauzy is fixed
 */
export function ProactiveTokenRefreshProvider({ children }: { children: React.ReactNode }) {
	// Initialize the proactive token refresh hook
	useProactiveTokenRefresh();

	return <>{children}</>;
}

