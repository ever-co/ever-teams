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
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			))}
		</div>
	);

	const renderSettingsSkeleton = () => (
		<div className="space-y-4">
			{Array.from({ length: 4 }).map((_, index) => (
				<div key={index} className="flex items-center justify-between">
					<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-12 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
				</div>
			))}
		</div>
	);

	const renderDangerSkeleton = () => (
		<div className="space-y-6">
			<div className="p-4 border border-red-200 dark:border-red-800 rounded-lg">
				<div className="w-40 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
				<div className="w-64 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-4" />
				<div className="w-24 h-8 bg-red-100 dark:bg-red-900 animate-pulse rounded" />
			</div>
		</div>
	);

	const renderSyncSkeleton = () => (
		<div className="space-y-4">
			{Array.from({ length: 3 }).map((_, index) => (
				<div key={index} className="flex items-center justify-between p-3 border rounded-lg">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="space-y-1">
							<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-32 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>
					<div className="w-12 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
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

	return (
		<div className={`mt-6 ${className}`}>
			{renderContent()}
		</div>
	);
};
