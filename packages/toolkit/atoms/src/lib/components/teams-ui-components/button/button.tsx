/** @jsxImportSource theme-ui */
'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@ever-teams/toolkit-ui';
import { StartIcon, PauseIcon } from '@ever-teams/toolkit-ui';
import { Tooltip } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTranslation } from 'react-i18next';

const teamsButtonVariants = cva(
	'flex items-center justify-center focus:border-none rounded-full  hover:scale-105 transition-all  shadow-xl dark:shadow-white/10 ',
	{
		variants: {
			variant: {
				default: 'bg-gradient-to-br from-primaryColor to-secondaryColor text-white',
				destructive:
					'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90',
				outline:
					'border border-[hsl(var(--input))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
				secondary:
					'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/80',
				ghost: 'hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
				link: 'text-[hsl(var(--primary))] underline-offset-4 hover:underline',
				bordered: 'border-2  border-secondaryColor text-secondaryColor'
			},
			size: {
				default: 'h-20 w-20',
				sm: 'h-10 w-10  px-3',
				lg: 'h-28 w-28 px-8'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export interface ITeamsButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof teamsButtonVariants> {
	asChild?: boolean;
	isRunning: boolean;
	startTimer: () => Promise<void>;
	stopTimer: () => Promise<void>;
	timerLoading: boolean;
}

const TeamsButton = ({
	ref,
	className,
	variant,
	size,
	asChild = false,
	isRunning,
	startTimer,
	stopTimer,
	timerLoading,
	...props
}: ITeamsButtonProps & {
	ref?: React.RefObject<HTMLButtonElement>;
}) => {
	const { t } = useTranslation();
	const { authenticatedUser } = useTeamsContext();
	const Comp = asChild ? Slot : 'button';
	const iconSize = size == 'default' ? 26 : size == 'lg' ? 32 : 20;

	return (
		<Tooltip
			placement="auto"
			message={
				!authenticatedUser
					? t('WARNING.start_without_account')
					: !authenticatedUser.employee
						? t('WARNING.not_employee')
						: ''
			}
		>
			<Comp
				className={cn(
					teamsButtonVariants({ variant, size, className }),
					(timerLoading || !authenticatedUser) && 'opacity-50  scale-105 cursor-not-allowed'
				)}
				ref={ref}
				sx={{ background: 'mainColor' }}
				onClick={isRunning ? stopTimer : startTimer}
				{...props}
				disabled={timerLoading || !authenticatedUser || !authenticatedUser.employee}
			>
				{isRunning ? <PauseIcon size={iconSize} /> : <StartIcon size={iconSize} />}
			</Comp>
		</Tooltip>
	);
};
TeamsButton.displayName = 'TeamsButton';

export { TeamsButton, teamsButtonVariants };
