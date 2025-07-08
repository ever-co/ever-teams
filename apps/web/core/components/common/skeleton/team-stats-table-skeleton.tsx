import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';

interface TeamStatsTableSkeletonProps {
	className?: string;
}

export function TeamStatsTableSkeleton({ className }: TeamStatsTableSkeletonProps) {
	return (
		<div className={`w-full dark:bg-dark--theme-light ${className || ''}`}>
			<div className="relative rounded-md border">
				<div className="overflow-x-auto">
					<div className="inline-block min-w-full align-middle">
						<div className="overflow-hidden">
							<Table className="w-full">
								<TableHeader>
									<TableRow className="font-normal text-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-200">
										<TableHead className="w-[320px] py-3">
											<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</TableHead>
										<TableHead className="w-[100px]">
											<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</TableHead>
										<TableHead className="w-[80px]">
											<div className="w-14 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</TableHead>
										<TableHead className="w-[120px]">
											<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</TableHead>
										<TableHead className="w-[100px]">
											<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</TableHead>
										<TableHead className="w-[80px]">
											<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</TableHead>
										<TableHead className="w-[100px]">
											<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{Array.from({ length: 8 }).map((_, index) => (
										<TableRow key={index} className="border-b border-gray-100 dark:border-gray-700">
											{/* Member column */}
											<TableCell className="py-4">
												<div className="flex items-center space-x-3">
													<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
													<div className="space-y-1">
														<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
														<div className="w-32 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
													</div>
												</div>
											</TableCell>
											{/* Time columns */}
											{Array.from({ length: 6 }).map((_, colIndex) => (
												<TableCell key={colIndex} className="py-4">
													<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
				</div>
			</div>

			{/* Pagination skeleton */}
			<div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 dark:border-gray-700">
				<div className="flex items-center space-x-2">
					<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
				<div className="flex items-center space-x-1">
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		</div>
	);
}
