import React from 'react';
import { Watch } from 'lucide-react';
import { cn } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@ever-teams/atoms';

export function Logo({
	name = 'C-Sphere',
	icon: Icon = Watch,
	iconClassName = 'size-10 text-blue-700',
	className,
	nameClassName = 'font-semibold text-xl',
	showIcon = true,
	showName = true
}: {
	name?: string;
	icon?: React.ElementType;
	iconClassName?: string;
	className?: string;
	nameClassName?: string;
	showIcon?: boolean;
	showName?: boolean;
}) {
	const {
		appliedTheme: { colors }
	} = useTeamsContext();

	return (
		<div className={cn('flex  items-center gap-1  dark:border-gray-700', className)}>
			{showIcon && <Icon className={cn(iconClassName)} color={colors?.borderColor} />}
			{showName && <span className={cn(nameClassName)}>{name}</span>}
		</div>
	);
}
