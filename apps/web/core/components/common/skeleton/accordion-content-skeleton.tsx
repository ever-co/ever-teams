import React from 'react';

interface AccordionContentSkeletonProps {
	type?: 'form' | 'settings' | 'danger' | 'sync';
	className?: string;
}

export const AccordionContentSkeleton = ({ type = 'form', className = '' }: AccordionContentSkeletonProps) => {
	const renderFormSkeleton = () => (
		<div className="space-y-4">
			{Array.from({ length: 3 }).map((_, index) => (
				<div key={index} className="flex items-center gap-4">
					<div className="w-20 h-4 bg-foreground/5 animate-pulse rounded-md" />
					<div className="w-48 h-9 bg-foreground/5 animate-pulse rounded-md" />
				</div>
			))}
		</div>
	);

	const renderSettingsSkeleton = () => (
		<div className="space-y-4">
			{Array.from({ length: 4 }).map((_, index) => (
				<div key={index} className="flex items-center justify-between">
					<div className="w-32 h-4 bg-foreground/5 animate-pulse rounded-md" />
					<div className="w-10.5 h-6 bg-foreground/5 animate-pulse rounded-full" />
				</div>
			))}
		</div>
	);

	const renderDangerSkeleton = () => (
		<div className="space-y-6">
			<div className="p-4 rounded-lg hairline-ring ring-destructive/20">
				<div className="w-40 h-4 bg-foreground/5 animate-pulse rounded-md mb-2" />
				<div className="w-64 h-3 bg-foreground/5 animate-pulse rounded-md mb-4" />
				<div className="w-24 h-9 bg-destructive/10 animate-pulse rounded-md" />
			</div>
		</div>
	);

	const renderSyncSkeleton = () => (
		<div className="space-y-4">
			{Array.from({ length: 3 }).map((_, index) => (
				<div key={index} className="flex items-center justify-between p-3 hairline-ring ring-border rounded-lg">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-foreground/5 animate-pulse rounded-md" />
						<div className="space-y-1">
							<div className="w-24 h-4 bg-foreground/5 animate-pulse rounded-md" />
							<div className="w-32 h-3 bg-foreground/5 animate-pulse rounded-md" />
						</div>
					</div>
					<div className="w-10.5 h-6 bg-foreground/5 animate-pulse rounded-full" />
				</div>
			))}
		</div>
	);

	const renderContent = () => {
		switch (type) {
			case 'settings':
				return renderSettingsSkeleton();
			case 'danger':
				return renderDangerSkeleton();
			case 'sync':
				return renderSyncSkeleton();
			default:
				return renderFormSkeleton();
		}
	};

	return <div className={`mt-6 ${className}`}>{renderContent()}</div>;
};
