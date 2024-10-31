import React from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchButton from './SearchButton';
import FilterButton from './FilterButton';
import StatusBadge from './BadgeStatus';

interface TeamTasksBannerProps {}

const TeamTasksBanner: React.FC<TeamTasksBannerProps> = () => {
	const statuses = [
		{ label: 'In Progress', count: 13, color: 'bg-violet-100' },
		{ label: 'On Time', count: 5, color: 'bg-emerald-100' }
	];

	return (
		<header className="flex flex-col leading-snug my-5">
			<div className="flex flex-wrap gap-10 justify-between items-center py-2 w-full max-md:max-w-full">
				<h1 className="self-stretch my-auto text-4xl font-semibold tracking-tighter text-indigo-950">
					Team Tasks
				</h1>
				<nav className="flex flex-wrap gap-3.5 items-center self-stretch my-auto text-sm font-medium tracking-tight min-w-[240px] text-indigo-950 max-md:max-w-full">
					<div className="flex gap-2.5 justify-center items-center self-stretch my-auto font-semibold text-slate-800">
						<div className="flex gap-1 items-start self-stretch my-auto">
							{statuses.map((status, index) => (
								<StatusBadge key={index} {...status} />
							))}
						</div>
					</div>
					<FilterButton />
					<div className="w-px h-6 bg-gray-200" />
					<SearchButton />
					<Button variant="ghost" size="icon" aria-label="More options">
						<MoreVertical className="h-4 w-4" />
					</Button>
				</nav>
			</div>
		</header>
	);
};

export default TeamTasksBanner;
