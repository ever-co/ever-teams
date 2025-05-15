import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { Check } from 'lucide-react';

export interface ViewOption {
	id: string;
	label: string;
	checked: boolean;
}

interface ViewSelectProps {
	viewOptions: ViewOption[];
	onChange: (options: ViewOption[]) => void;
}

export default function ViewSelect({ viewOptions, onChange }: ViewSelectProps) {
	const handleCheckChange = React.useCallback(
		(id: string) => {
			const newOptions = viewOptions.map((option) =>
				option.id === id ? { ...option, checked: !option.checked } : option
			);
			onChange(newOptions);
		},
		[viewOptions, onChange]
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="gap-2 -white dark:bg-dark--theme-light">
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="w-4 h-4"
					>
						<path
							d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z"
							className="fill-current"
						/>
						<path
							d="M4 13C4 12.4477 4.44772 12 5 12H19C19.5523 12 20 12.4477 20 13V15C20 15.5523 19.5523 16 19 16H5C4.44772 16 4 15.5523 4 15V13Z"
							className="fill-current"
						/>
					</svg>
					View
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="p-2 w-56 dark:bg-dark-high">
				{viewOptions.map((option) => (
					<div
						key={option.id}
						role="menuitem"
						tabIndex={0}
						className="flex items-center p-2 space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
						data-state={option.checked ? 'checked' : 'unchecked'}
						onClick={() => handleCheckChange(option.id)}
						onKeyDown={(e) => e.key === 'Enter' && handleCheckChange(option.id)}
					>
						<div className="flex items-center justify-center w-4 h-4 text-gray-700 dark:text-white transition-colors">
							<Check
								className={`w-4 h-4 transition-opacity ${option.checked ? 'opacity-100' : 'opacity-0'}`}
							/>
						</div>
						<span
							className="text-sm transition-colors data-[state=checked]:text-blue-600 dark:data-[state=checked]:text-blue-400"
							data-state={option.checked ? 'checked' : 'unchecked'}
						>
							{option.label}
						</span>
					</div>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
