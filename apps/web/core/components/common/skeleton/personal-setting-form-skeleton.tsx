import React from 'react';

export const PersonalSettingFormSkeleton = () => {
	return (
		<div className="space-y-6 mt-6">
			{/* Full Name Section */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="w-24 h-4 bg-foreground/5 animate-pulse rounded-md" />
					<div className="w-32 h-4 bg-foreground/5 animate-pulse rounded-md" />
				</div>
				<div className="w-20 h-9 bg-foreground/5 animate-pulse rounded-md" />
			</div>

			{/* Contact Information */}
			<div className="space-y-4">
				<div className="w-40 h-4 bg-foreground/5 animate-pulse rounded-md" />

				{/* Email Field */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="w-16 h-4 bg-foreground/5 animate-pulse rounded-md" />
						<div className="w-48 h-9 bg-foreground/5 animate-pulse rounded-md" />
					</div>
					<div className="w-20 h-9 bg-foreground/5 animate-pulse rounded-md" />
				</div>

				{/* Phone Field */}
				<div className="flex items-center gap-4">
					<div className="w-16 h-4 bg-foreground/5 animate-pulse rounded-md" />
					<div className="w-48 h-9 bg-foreground/5 animate-pulse rounded-md" />
				</div>
			</div>

			{/* Language & Timezone */}
			<div className="space-y-4">
				<div className="w-32 h-4 bg-foreground/5 animate-pulse rounded-md" />

				<div className="flex items-center gap-4">
					<div className="w-20 h-4 bg-foreground/5 animate-pulse rounded-md" />
					<div className="w-40 h-9 bg-foreground/5 animate-pulse rounded-md" />
				</div>

				<div className="flex items-center gap-4">
					<div className="w-20 h-4 bg-foreground/5 animate-pulse rounded-md" />
					<div className="w-40 h-9 bg-foreground/5 animate-pulse rounded-md" />
				</div>
			</div>

			{/* Theme Toggle */}
			<div className="flex items-center justify-between">
				<div className="w-24 h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-10.5 h-6 bg-foreground/5 animate-pulse rounded-full" />
			</div>

			{/* Save Button */}
			<div className="flex justify-end">
				<div className="w-20 h-9 bg-foreground/5 animate-pulse rounded-md" />
			</div>
		</div>
	);
};
