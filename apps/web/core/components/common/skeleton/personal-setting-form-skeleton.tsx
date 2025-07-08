import React from 'react';

export const PersonalSettingFormSkeleton = () => {
	return (
		<div className="space-y-6 mt-6">
			{/* Full Name Section */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
				<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Contact Information */}
			<div className="space-y-4">
				<div className="w-40 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				
				{/* Email Field */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
					<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Phone Field */}
				<div className="flex items-center gap-4">
					<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>

			{/* Language & Timezone */}
			<div className="space-y-4">
				<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				
				<div className="flex items-center gap-4">
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-40 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				<div className="flex items-center gap-4">
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-40 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>

			{/* Theme Toggle */}
			<div className="flex items-center justify-between">
				<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-12 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
			</div>

			{/* Save Button */}
			<div className="flex justify-end">
				<div className="w-20 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
};
