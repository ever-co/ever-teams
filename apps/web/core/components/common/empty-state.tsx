import { FC } from 'react';
import Image from 'next/image';
import { cn } from '@/core/lib/helpers';
import { Button } from '../duplicated-components/_button';
import { AnimatedDataSvg } from './animated-data-svg';

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

interface AnimatedEmptyStateProps {
	/** Title text to display */
	title: string;
	/** Main message to display */
	message: React.ReactNode;
	/** Additional CSS classes for the container */
	className?: string;
	/** Custom icon or image component to display */
	icon?: React.ReactNode;
	/** Whether to show the default animated data visualization */
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
	/** Size of the icon container (w-{size} h-{size}) */
	iconContainerSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	/** Size of the icon itself (w-{size} h-{size}) */
	iconSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeMap = {
	sm: '32',
	md: '40',
	lg: '52',
	xl: '64',
	'2xl': '72'
} as const;

/**
 * AnimatedEmptyState component with data visualization animation
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
	return (
		<div
			className={cn(
				'grow w-full rounded-md flex flex-col items-center justify-center h-full transition-colors duration-150',
				!noBg && 'bg-white dark:bg-dark--theme',
				showBorder && 'border border-gray-100 dark:border-gray-800',
				className
			)}
			style={{ minHeight }}
		>
			<div className="flex flex-col items-center justify-center gap-6 text-center max-w-sm mx-auto p-8">
				{/* Animated illustration container */}
				<div className={cn('relative', `w-${sizeMap[iconContainerSize]} h-${sizeMap[iconContainerSize]}`)}>
					{/* Background circles for depth */}
					<div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary-light/10 dark:to-primary-light/5 blur-xl" />
					<div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/95 to-primary/90 dark:from-primary-light dark:via-primary-light/95 dark:to-primary-light/90 shadow-lg shadow-primary/20 dark:shadow-primary-light/20">
						{/* SVG container with perfect centering */}
						<div className="absolute inset-0 flex items-center justify-center text-white dark:text-gray-900">
							<div className={cn(`w-${sizeMap[iconSize]} h-${sizeMap[iconSize]}`)}>
								{icon ? icon : showDefaultAnimation ? <AnimatedDataSvg /> : null}
							</div>
						</div>
						{/* Subtle overlay for depth */}
						<div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/5 dark:from-white/10 dark:to-black/10" />
					</div>
				</div>

				{/* Text content with refined typography */}
				<div className="space-y-3">
					<h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
						{title}
					</h3>
					<div className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{message}</div>
					{actionLabel && onAction && (
						<Button onClick={onAction} variant={actionVariant} className="mt-4">
							{actionLabel}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};
