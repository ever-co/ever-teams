import React from 'react';

export const ExportPDFSkeleton = () => {
	return (
		<div className="flex items-center justify-center p-4">
			<div className="flex items-center gap-2">
				<div className="w-4 h-4 bg-foreground/5 animate-pulse rounded-sm" />
				<div className="w-24 h-4 bg-foreground/5 animate-pulse rounded-md" />
			</div>
		</div>
	);
};
