import { useLocation, Outlet } from 'react-router-dom';
export default function ReportsLayout() {
	const location = useLocation();

	const getTitle = () => {
		if (location.pathname.includes('employee')) {
			return 'Employee Reports';
		}
		if (location.pathname.includes('manager')) {
			return 'Manager Reports';
		}
		return 'Reports';
	};

	return (
		<div className="w-full max-w-6xl mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">{getTitle()}</h1>
				<p className="mt-2 text-gray-600 dark:text-gray-400">
					View and analyze time tracking data and productivity metrics.
				</p>
			</div>
			<Outlet />
		</div>
	);
}
