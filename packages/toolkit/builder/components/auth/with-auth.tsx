'use client';
import { useAccessToken } from '@ever-teams/atoms';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const getStoredToken = () => {
	if (typeof window !== 'undefined') {
		return localStorage.getItem('auth-token');
	}
	return null;
};

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
	return function ProtectedComponent(props: P) {
		const { accessToken, setAccessToken } = useAccessToken();
		const router = useRouter();
		const [isClient, setIsClient] = useState(false);

		const isBuilderPreview =
			typeof window !== 'undefined' &&
			(window.location.search.includes('builder.preview=') ||
				window.location.search.includes('builder.frameEditing='));

		useEffect(() => {
			setIsClient(true);
		}, []);

		useEffect(() => {
			if (!isClient) return;
			if (isBuilderPreview) return;

			const storedToken = getStoredToken();

			if (storedToken && !accessToken) {
				setAccessToken(storedToken);
			}

			const handleUnauthorized = (e: Event) => {
				const response = (e as any).response;
				if (response?.status === 401) {
					if (typeof window !== 'undefined') {
						localStorage.removeItem('auth-token');
					}
					setAccessToken('');
				}
			};

			if (!storedToken && !accessToken) {
				const currentPath = window.location.pathname;
				router.push(`/auth?returnUrl=${currentPath}`);
				return;
			}

			window.addEventListener('unhandledrejection', handleUnauthorized);
			return () => window.removeEventListener('unhandledrejection', handleUnauthorized);
		}, [accessToken, setAccessToken, router, isClient, isBuilderPreview]);

		if (isBuilderPreview) {
			return <Component {...props} />;
		}

		if (!isClient || (!accessToken && !getStoredToken())) {
			return null;
		}

		return <Component {...props} />;
	};
}
