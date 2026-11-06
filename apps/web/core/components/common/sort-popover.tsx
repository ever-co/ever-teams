import { SortConfig } from '@/core/hooks/common/use-sortable-data';
import { Button } from '@/core/components/duplicated-components/_button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { ChevronsUpDown } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

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
			<span className="text-xs whitespace-nowrap">{label}</span>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						className={cn('text-muted-foreground', isActive && 'bg-foreground/5')}
					>
						<ChevronsUpDown className={cn(isActive && 'text-primary')} />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-28 p-1">
					<div className="flex flex-col gap-0.5">
						<Button
							variant="ghost"
							className={cn('justify-start text-xs', currentDirection === 'asc' && 'bg-foreground/5')}
							onClick={() => onSort(sortKey)}
						>
							ASC
							{currentDirection === 'asc' && (
								<span className="ml-2 text-xs text-muted-foreground">•</span>
							)}
						</Button>
						<Button
							variant="ghost"
							className={cn('justify-start text-xs', currentDirection === 'desc' && 'bg-foreground/5')}
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
