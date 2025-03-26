import { FC } from 'react';
import Image from 'next/image';
import { Button } from './button';
import { cn } from '@/lib/utils';

type EmptyStateType = 'default' | 'search' | 'filter' | 'data' | 'error' | 'tasks' | 'projects';

/**
 * Default configurations for different empty state types
 */
const defaultConfigs: Record<EmptyStateType, { title: string; message: string; imageSrc: string }> = {
	default: {
		title: 'No Data',
		message: 'No data available at the moment',
		imageSrc: '/assets/illustrations/empty-default.svg'
	},
	search: {
		title: 'No Results',
		message: 'No results match your search criteria',
		imageSrc: '/assets/illustrations/empty-search.svg'
	},
	filter: {
		title: 'No Matches',
		message: 'No items match the selected filters',
		imageSrc: '/assets/illustrations/empty-filter.svg'
	},
	data: {
		title: 'Empty Data',
		message: 'No data has been added yet',
		imageSrc: '/assets/illustrations/empty-data.svg'
	},
	error: {
		title: 'Loading Error',
		message: 'An error occurred while loading the data',
		imageSrc: '/assets/illustrations/empty-error.svg'
	},
	tasks: {
		title: 'No Tasks',
		message: "You don't have any tasks assigned yet",
		imageSrc: '/assets/illustrations/empty-tasks.svg'
	},
	projects: {
		title: 'No Projects',
		message: "You haven't created any projects yet",
		imageSrc: '/assets/illustrations/empty-projects.svg'
	}
};

/**
 * EmptyState component props
 */
export interface EmptyStateProps {
	/** Type of empty state to display */
	type?: EmptyStateType;
	/** Title text to display (overrides type default) */
	title?: string;
	/** Main message to display (overrides type default) */
	message?: string;
	/** Path to custom illustration (overrides type default) */
	imageSrc?: string;
	/** Label for the action button */
	actionLabel?: string;
	/** Callback function for action button click */
	onAction?: () => void;
	/** Whether to show the illustration */
	showImage?: boolean;
	/** Additional CSS classes for the container */
	className?: string;
	/** Size variant of the empty state */
	size?: 'sm' | 'md' | 'lg';
	/** Visual variant of the empty state */
	variant?: 'default' | 'subtle' | 'card';
}

/**
 * EmptyState component
 */
export const EmptyState: FC<EmptyStateProps> = ({
	type = 'default',
	title: customTitle,
	message: customMessage,
	imageSrc: customImageSrc,
	actionLabel,
	onAction,
	showImage = false,
	className,
	size = 'md',
	variant = 'default'
}) => {
	const { title, message, imageSrc } = defaultConfigs[type];

	const finalTitle = customTitle || title;
	const finalMessage = customMessage || message;
	const finalImageSrc = customImageSrc || imageSrc;

	const sizeClasses = {
		sm: 'p-4 gap-2',
		md: 'p-8 gap-4',
		lg: 'p-12 gap-6'
	};

	const variantClasses = {
		default: 'bg-transparent',
		subtle: 'bg-muted/50 rounded-lg',
		card: 'bg-card border rounded-lg shadow-sm'
	};

	const imageSize = {
		sm: 'w-24 h-24',
		md: 'w-48 h-48',
		lg: 'w-64 h-64'
	};

	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center text-center',
				sizeClasses[size],
				variantClasses[variant],
				className
			)}
		>
			{showImage && (
				<div className={cn('relative mb-4', imageSize[size])}>
					<Image src={finalImageSrc} alt={finalTitle} fill className="object-contain" priority={true} />
				</div>
			)}
			{finalTitle && (
				<h3
					className={cn(
						'font-semibold text-foreground',
						size === 'sm' && 'text-base',
						size === 'md' && 'text-xl',
						size === 'lg' && 'text-2xl'
					)}
				>
					{finalTitle}
				</h3>
			)}
			<p
				className={cn(
					'text-muted-foreground',
					size === 'sm' && 'text-sm',
					size === 'md' && 'text-base',
					size === 'lg' && 'text-lg'
				)}
			>
				{finalMessage}
			</p>
			{actionLabel && onAction && (
				<Button
					onClick={onAction}
					variant="default"
					size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'default'}
					className="mt-4"
				>
					{actionLabel}
				</Button>
			)}
		</div>
	);
};
