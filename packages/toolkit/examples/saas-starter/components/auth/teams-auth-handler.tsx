'use client';

import { ReactElement, useEffect, useState } from 'react';
import { useAccessToken } from '@ever-teams/atoms';
import { authLogin, createCompleteAccount } from '@ever-teams/api';

/**
 * Component that handles Teams authentication after successful local login
 * This runs on the dashboard and other authenticated pages
 */
export function TeamsAuthHandler(): ReactElement | null {
	const { setAccessToken, accessToken } = useAccessToken();
	const [isProcessing, setIsProcessing] = useState(false);
	const [hasProcessed, setHasProcessed] = useState(false);

	useEffect(() => {
		const handleTeamsAuth = async () => {
			// Skip if already has Teams token or already processed
			if (accessToken || hasProcessed || isProcessing) {
				return;
			}

			// Check if we have login credentials stored from recent login
			const recentLogin = sessionStorage.getItem('recent-login-credentials');
			if (!recentLogin) {
				return;
			}

			setIsProcessing(true);

			try {
				const { email, password, timestamp } = JSON.parse(recentLogin);

				// Only process if the login was recent (within last 30 seconds)
				if (Date.now() - timestamp > 30000) {
					sessionStorage.removeItem('recent-login-credentials');
					return;
				}

				// Try to authenticate with Teams
				console.log('Attempting Teams login for:', email);
				const teamsResult = await authLogin({ email, password });

				if (teamsResult && 'token' in teamsResult) {
					// Use Teams's native session management
					setAccessToken(teamsResult.token);
				} else {
					// Create complete account with full organizational setup
					console.log('Creating complete Teams account...');
					const setupResult = await createCompleteAccount({
						fullName: email.includes('@') ? email.split('@')[0] : email, // Could enhance to get from local user data
						email,
						password,
						confirmPassword: password
					});

					if ('token' in setupResult) {
						setAccessToken(setupResult.token);
					} else {
						console.warn('❌ Teams account setup failed:', setupResult.error || setupResult.message);
					}
				}

				// Clear the stored credentials after processing
				sessionStorage.removeItem('recent-login-credentials');
			} catch (error) {
				console.warn('❌ Teams authentication failed:', error);
			} finally {
				setIsProcessing(false);
				setHasProcessed(true);
			}
		};

		handleTeamsAuth();
	}, [accessToken, hasProcessed, isProcessing, setAccessToken]);

	// This component renders nothing visible
	return null;
}
