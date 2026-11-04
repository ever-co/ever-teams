// Adapted from prompt-kit (https://www.prompt-kit.com), MIT licence.
'use client';

import { cn } from '@/core/lib/helpers';

type LoaderSize = 'sm' | 'md' | 'lg';

export interface LoaderProps {
	variant?: 'circular' | 'typing';
	size?: LoaderSize;
	label?: string;
	className?: string;
}

type VariantLoaderProps = {
	className?: string;
	size?: LoaderSize;
	label?: string;
};

const CIRCLE_SIZES: Record<LoaderSize, string> = {
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-6'
};

const DOT_SIZES: Record<LoaderSize, string> = {
	sm: 'size-1',
	md: 'size-1.5',
	lg: 'size-2'
};

const DOT_ROW_HEIGHTS: Record<LoaderSize, string> = {
	sm: 'h-4',
	md: 'h-5',
	lg: 'h-6'
};

const DOT_DELAYS = ['0ms', '150ms', '300ms'];

function LoaderLabel({ label }: Readonly<{ label?: string }>) {
	if (!label) {
		return null;
	}
	return <span className="sr-only">{label}</span>;
}

export function CircularLoader({ className, size = 'md', label }: Readonly<VariantLoaderProps>) {
	return (
		<div
			className={cn(
				'animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground',
				CIRCLE_SIZES[size],
				className
			)}
		>
			<LoaderLabel label={label} />
		</div>
	);
}

export function TypingLoader({ className, size = 'md', label }: Readonly<VariantLoaderProps>) {
	return (
		<div className={cn('flex items-center gap-1', DOT_ROW_HEIGHTS[size], className)}>
			{DOT_DELAYS.map((delay) => (
				<span
					key={delay}
					aria-hidden="true"
					className={cn('animate-pulse rounded-full bg-muted-foreground', DOT_SIZES[size])}
					style={{ animationDelay: delay }}
				/>
			))}
			<LoaderLabel label={label} />
		</div>
	);
}

function Loader({ variant = 'circular', size = 'md', label, className }: Readonly<LoaderProps>) {
	if (variant === 'typing') {
		return <TypingLoader size={size} label={label} className={className} />;
	}
	return <CircularLoader size={size} label={label} className={className} />;
}

export { Loader };
