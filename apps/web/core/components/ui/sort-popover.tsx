import { SortConfig } from '@/core/hooks/useSortableData';
import { Button } from '@/core/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/ui/popover';
import { ChevronsUpDown } from 'lucide-react';

interface SortPopoverProps {
	label: string;
	sortKey: string;
	currentConfig: SortConfig;
	onSort: (key: string) => void;
}

export function SortPopover({ label, sortKey, currentConfig, onSort }: SortPopoverProps) {
	const isActive = currentConfig?.key === sortKey;
	const currentDirection = isActive ? currentConfig.direction : null;

	return (
		<div className="flex gap-2 items-center">
			{label}
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className={`w-4 h-4 hover:bg-gray-100 dark:hover:bg-gray-700 ${isActive ? 'bg-gray-100 dark:bg-dark--theme-light' : ''}`}
					>
						<ChevronsUpDown className={isActive ? 'text-primary' : ''} />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-2 w-28 dark:bg-dark--theme-light dark:text-white">
					<div className="flex flex-col gap-1">
						<Button
							variant={currentDirection === 'asc' ? 'secondary' : 'ghost'}
							className="justify-start text-[12px]"
							onClick={() => onSort(sortKey)}
						>
							ASC
							{currentDirection === 'asc' && (
								<span className="ml-2 text-xs text-muted-foreground">•</span>
							)}
						</Button>
						<Button
							variant={currentDirection === 'desc' ? 'secondary' : 'ghost'}
							className="justify-start text-[12px]"
							onClick={() => onSort(sortKey)}
						>
							DESC
							{currentDirection === 'desc' && (
								<span className="ml-2 text-xs text-muted-foreground">•</span>
							)}
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
