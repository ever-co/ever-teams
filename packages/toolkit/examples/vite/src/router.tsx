import { createBrowserRouter, useRouteError } from 'react-router-dom';
import ClientLayout from './components/layout/ClientLayout';
import HomePage from './pages/HomePage';
import TimeTrackerPage from './pages/TimeTrackerPage';
import EmployeeReportsPage from './pages/EmployeeReportsPage';
import ManagerReportsPage from './pages/ManagerReportsPage';
import ReplayPage from './pages/ReplayPage';
import ReportsLayout from './components/layout/ReportsLayout';
import ProtectedRoute from './components/ProtectedRoute';

function ErrorFallback() {
	const error = useRouteError() as Error;
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h2 className="text-lg font-semibold">Something went wrong</h2>
				<p className="mt-2 text-sm text-gray-500">{error?.message || 'Unknown error'}</p>
			</div>
		</div>
	);
}

export const router = createBrowserRouter([
	{
		path: '/',
		element: <ClientLayout />,
		errorElement: <ErrorFallback />,
		children: [
			{
				index: true,
				element: <HomePage />
			},
			{
				path: 'time/time-tracker',
				element: (
					<ProtectedRoute>
						<TimeTrackerPage />
					</ProtectedRoute>
				)
			},
			{
				path: 'reports',
				element: <ReportsLayout />,
				children: [
					{
						path: 'employee',
						element: (
							<ProtectedRoute>
								<EmployeeReportsPage />
							</ProtectedRoute>
						)
					},
					{
						path: 'manager',
						element: (
							<ProtectedRoute>
								<ManagerReportsPage />
							</ProtectedRoute>
						)
					}
				]
			},
			{
				path: 'replay',
				element: <ReplayPage />
			}
		]
	}
]);
