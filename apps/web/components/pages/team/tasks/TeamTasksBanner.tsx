import { Button } from '@/components/ui/button';
import SearchButton from './SearchButton';
import FilterButton from './FilterButton';
import StatusBadge from './StatusBadge';
import { Table } from '@tanstack/react-table';
import { ITaskStatus, ITeamTask } from '@/app/interfaces';

interface TeamTasksBannerProps<TData> {
	table: Table<TData>;
	data: TData[];
}

export default function TeamTasksBanner<TData>({ table, data }: Readonly<TeamTasksBannerProps<TData>>) {
	const tasks = data as ITeamTask[];
	return (
		<header className="flex flex-col my-5 leading-snug">
			<div className="flex flex-wrap items-center justify-between w-full gap-10 py-2 max-md:max-w-full">
				<h1 className="self-stretch my-auto text-4xl font-medium tracking-tighter text-indigo-950">
					Team Tasks
				</h1>
				<nav className="flex flex-wrap gap-3.5 items-center self-stretch my-auto text-sm font-medium tracking-tight min-w-[240px] text-indigo-950 max-md:max-w-full">
					<div className="flex gap-2.5 justify-center items-center self-stretch my-auto font-medium text-slate-800">
						<div className="flex items-start self-stretch gap-1 my-auto">
							{tasks.map((taskStatus, index) => (
								<StatusBadge
									key={index}
									color={getStatusColor(taskStatus.status)}
									label={taskStatus.status?.split('-').join(' ')}
									count={tasks.filter((item) => item.status === taskStatus.status).length}
								/>
							))}
						</div>
					</div>
					<FilterButton table={table} />
					<div className="w-px h-6 bg-gray-200" />
					<SearchButton table={table} />
					<Button className="text-[#B1AEBC]" variant="ghost" size="icon" aria-label="More options">
						<svg
							className="w-4 h-4"
							width={24}
							height={24}
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10Z"
								stroke="currentColor"
								strokeWidth="1.3"
							/>
							<path
								d="M19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10Z"
								stroke="currentColor"
								strokeWidth="1.3"
							/>
							<path
								d="M12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
								stroke="currentColor"
								strokeWidth="1.3"
							/>
						</svg>
					</Button>
				</nav>
			</div>
		</header>
	);
}
function getStatusColor(status: ITaskStatus) {
	switch (status) {
		case 'in-review':
			return 'bg-[#f3d8b0]';
		case 'backlog':
			return 'bg-[#ffcc00]';
		case 'open':
			return 'bg-[#d6e4f9]';
		case 'in-progress':
			return 'bg-[#ece8fc]';
		case 'ready-for-review':
			return 'bg-[#f5f1cb]';
		case 'blocked':
			return 'bg-[#f5b8b8]';
		case 'done':
			return 'bg-[#4caf50] text-gray-100';
		case 'completed':
			return 'bg-[#d4efdf]';
		case 'custom':
			return 'bg-[#d4efdf]';
		default:
			return 'bg-gray-100 text-gray-800';
	}
}
