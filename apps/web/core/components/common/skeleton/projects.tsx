import { Skeleton } from '../skeleton';

/**
 * Project detail page skeleton component
 */
export function ProjectDetailSkeleton() {
	return (
		<div className="p-4 md:p-6 lg:p-8">
			<div className="flex flex-col max-w-5xl gap-8 mx-auto">
				{/* Hero Section Skeleton */}
				<div className="flex flex-col items-start gap-6 p-6 bg-white border shadow-sm md:flex-row dark:bg-dark--theme-light rounded-xl dark:border-gray-800">
					{/* Image Skeleton */}
					<Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-xl shrink-0" />

					{/* Info Skeleton */}
					<div className="flex flex-col flex-1 gap-3">
						<div className="flex items-center gap-3">
							<Skeleton className="w-64 h-8" />
							<Skeleton className="w-16 h-5 rounded-full" />
						</div>
						<div className="flex gap-4">
							<Skeleton className="w-20 h-4" />
							<Skeleton className="w-24 h-4" />
							<Skeleton className="w-32 h-4" />
						</div>
						<Skeleton className="w-48 h-4" />
						<Skeleton className="w-full h-4 max-w-md" />
					</div>
				</div>

				{/* Dates Section Skeleton */}
				<div className="flex flex-col gap-3 p-4 bg-white border dark:bg-dark--theme-light rounded-xl dark:border-gray-800">
					<Skeleton className="w-24 h-5" />
					<div className="flex gap-8">
						<div className="flex flex-col gap-2">
							<Skeleton className="w-20 h-3" />
							<Skeleton className="h-4 w-28" />
						</div>
						<div className="flex flex-col gap-2">
							<Skeleton className="w-20 h-3" />
							<Skeleton className="h-4 w-28" />
						</div>
					</div>
				</div>

				{/* Description Section Skeleton */}
				<div className="flex flex-col gap-3 p-4 bg-white border dark:bg-dark--theme-light rounded-xl dark:border-gray-800">
					<Skeleton className="h-5 w-28" />
					<div className="space-y-2">
						<Skeleton className="w-full h-4" />
						<Skeleton className="w-5/6 h-4" />
						<Skeleton className="w-4/6 h-4" />
					</div>
				</div>

				{/* Grid Section Skeleton */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					{/* Tags Section */}
					<div className="flex flex-col gap-3 p-4 bg-white border dark:bg-dark--theme-light rounded-xl dark:border-gray-800">
						<Skeleton className="h-5 w-28" />
						<div className="flex flex-wrap gap-2">
							<Skeleton className="w-20 h-6 rounded-full" />
							<Skeleton className="w-24 h-6 rounded-full" />
							<Skeleton className="w-16 h-6 rounded-full" />
						</div>
					</div>

					{/* Teams Section */}
					<div className="flex flex-col gap-3 p-4 bg-white border dark:bg-dark--theme-light rounded-xl dark:border-gray-800">
						<Skeleton className="w-20 h-5" />
						<div className="flex flex-wrap gap-2">
							<Skeleton className="h-8 rounded-lg w-28" />
							<Skeleton className="w-32 h-8 rounded-lg" />
						</div>
					</div>
				</div>

				{/* Members Section Skeleton */}
				<div className="flex flex-col gap-3 p-4 bg-white border dark:bg-dark--theme-light rounded-xl dark:border-gray-800">
					<Skeleton className="h-5 w-36" />
					<div className="space-y-4">
						<div>
							<Skeleton className="w-24 h-4 mb-3" />
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{[1, 2].map((i) => (
									<div
										key={i}
										className="flex items-center gap-3 p-3 border rounded-lg dark:border-gray-700"
									>
										<Skeleton className="w-10 h-10 rounded-full" />
										<div className="flex flex-col flex-1 gap-1">
											<Skeleton className="h-4 w-28" />
											<Skeleton className="h-3 w-36" />
										</div>
									</div>
								))}
							</div>
						</div>
						<div>
							<Skeleton className="w-24 h-4 mb-3" />
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className="flex items-center gap-3 p-3 border rounded-lg dark:border-gray-700"
									>
										<Skeleton className="w-10 h-10 rounded-full" />
										<div className="flex flex-col flex-1 gap-1">
											<Skeleton className="h-4 w-28" />
											<Skeleton className="h-3 w-36" />
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
