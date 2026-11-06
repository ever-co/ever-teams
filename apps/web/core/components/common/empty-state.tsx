import { FC } from 'react';
import Image from 'next/image';
import { cn } from '@/core/lib/helpers';
import { Analytics } from '@/core/components/icons';
import { Button } from '../duplicated-components/_button';

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
		sm: 'p-4 gap-1',
		md: 'p-8 gap-1',
		lg: 'p-12 gap-1.5'
	};

	const variantClasses = {
		default: 'bg-transparent',
		subtle: 'rounded-lg bg-foreground/[0.03]',
		card: 'rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5'
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
						'font-semibold text-balance text-foreground',
						size === 'sm' && 'text-sm',
						size === 'md' && 'text-sm',
						size === 'lg' && 'text-base'
					)}
				>
					{finalTitle}
				</h3>
			)}
			<p
				className={cn(
					'text-balance text-muted-foreground',
					size === 'sm' && 'text-sm',
					size === 'md' && 'text-sm',
					size === 'lg' && 'text-base'
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

interface AnimatedEmptyStateProps {
	/** Title text to display */
	title: string;
	/** Main message to display */
	message: React.ReactNode;
	/** Additional CSS classes for the container */
	className?: string;
	/** Custom icon or image component to display */
	icon?: React.ReactNode;
	/** Whether to show the default data icon when no icon is given */
	showDefaultAnimation?: boolean;
	/** Whether to show the border */
	showBorder?: boolean;
	/** Action button label */
	actionLabel?: string;
	/** Action button callback */
	onAction?: () => void;
	/** Action button variant */
	actionVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
	/** Minimum height of the container */
	minHeight?: string;
	/** Background color of the container */
	noBg?: boolean;
	/** Size of the icon tile */
	iconContainerSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	/** Size of the icon inside the tile */
	iconSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const iconTileSizeClasses = {
	sm: 'size-8',
	md: 'size-10',
	lg: 'size-10',
	xl: 'size-12',
	'2xl': 'size-14'
} as const;

const iconSizeClasses = {
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-5',
	xl: 'size-6',
	'2xl': 'size-7'
} as const;

function renderEmptyStateIcon(icon: React.ReactNode, showDefaultIcon: boolean) {
	if (icon) {
		return icon;
	}
	if (showDefaultIcon) {
		return <Analytics />;
	}
	return null;
}

/**
 * AnimatedEmptyState: icon tile, title, message and at most one action, placed where the data would be
 */
export const AnimatedEmptyState: FC<AnimatedEmptyStateProps> = ({
	title,
	message,
	className,
	icon,
	showDefaultAnimation = true,
	showBorder = true,
	actionLabel,
	onAction,
	actionVariant = 'default',
	minHeight = '280px',
	noBg = false,
	iconContainerSize = 'lg',
	iconSize = 'md'
}) => {
	const hasAction = Boolean(actionLabel) && Boolean(onAction);

	return (
		<div
			className={cn(
				'grow w-full rounded-xl flex flex-col items-center justify-center h-full',
				!noBg && 'bg-card',
				showBorder && 'hairline-ring ring-border',
				className
			)}
			style={{ minHeight }}
		>
			<div className="flex flex-col items-center justify-center gap-3 text-center max-w-sm mx-auto p-8">
				<div
					className={cn(
						'flex shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground',
						iconTileSizeClasses[iconContainerSize]
					)}
				>
					<div
						className={cn('flex items-center justify-center [&_svg]:size-full', iconSizeClasses[iconSize])}
					>
						{renderEmptyStateIcon(icon, showDefaultAnimation)}
					</div>
				</div>

				<div className="space-y-1">
					<h3 className="text-sm font-semibold text-balance text-foreground">{title}</h3>
					<div className="text-sm text-balance text-muted-foreground">{message}</div>
					{hasAction && (
						<Button onClick={onAction} variant={actionVariant} className="mt-4">
							{actionLabel}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};
