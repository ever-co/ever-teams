import { Navigate } from 'react-router-dom';
import { useTeamsContext } from '@ever-teams/atoms';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
	children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { authenticatedUser, loadings } = useTeamsContext();

	if (loadings?.userLoading) {
		return <div>Loading...</div>; // To be replace this with a loading component
	}

	if (!authenticatedUser) {
		return <Navigate to="/" replace />;
	}

	return <>{children}</>;
}
