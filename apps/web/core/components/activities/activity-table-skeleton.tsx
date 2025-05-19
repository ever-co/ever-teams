import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';

interface ActivityTableSkeletonProps {
	columnVisibility: {
		member: boolean;
		project: boolean;
		task: boolean;
		trackedHours: boolean;
		earnings: boolean;
		activityLevel: boolean;
		startedAt: boolean;
		stoppedAt: boolean;
		duration: boolean;
	};
	withFooter?: boolean;
}

export default function ActivityTableSkeleton({ columnVisibility, withFooter = true }: ActivityTableSkeletonProps) {
	return (
		<div className="space-y-4">
			{[1, 2].map((groupIndex) => (
				<div key={groupIndex}>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>
									<Skeleton className="h-4 w-32" />
								</TableHead>
								{columnVisibility.project && (
									<TableHead>
										<Skeleton className="h-4 w-24" />
									</TableHead>
								)}
								{columnVisibility.task && (
									<TableHead>
										<Skeleton className="h-4 w-24" />
									</TableHead>
								)}
								{columnVisibility.startedAt && (
									<TableHead>
										<Skeleton className="h-4 w-24" />
									</TableHead>
								)}
								{columnVisibility.stoppedAt && (
									<TableHead>
										<Skeleton className="h-4 w-24" />
									</TableHead>
								)}
								{columnVisibility.duration && (
									<TableHead>
										<Skeleton className="h-4 w-24" />
									</TableHead>
								)}
								{columnVisibility.earnings && (
									<TableHead>
										<Skeleton className="h-4 w-24" />
									</TableHead>
								)}
								{columnVisibility.activityLevel && (
									<TableHead>
										<Skeleton className="h-4 w-24" />
									</TableHead>
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{[1, 2, 3, 4, 5].map((index) => (
								<TableRow key={index}>
									<TableCell>
										<div className="flex items-center gap-2">
											<Skeleton className="h-8 w-8 rounded-full" />
											<Skeleton className="h-4 w-24" />
										</div>
									</TableCell>
									{columnVisibility.project && (
										<TableCell>
											<div className="flex items-center gap-2">
												<Skeleton className="h-8 w-8 rounded-full" />
												<Skeleton className="h-4 w-24" />
											</div>
										</TableCell>
									)}
									{columnVisibility.task && (
										<TableCell>
											<Skeleton className="h-4 w-32" />
										</TableCell>
									)}
									{columnVisibility.startedAt && (
										<TableCell>
											<Skeleton className="h-4 w-20" />
										</TableCell>
									)}
									{columnVisibility.stoppedAt && (
										<TableCell>
											<Skeleton className="h-4 w-20" />
										</TableCell>
									)}
									{columnVisibility.duration && (
										<TableCell>
											<Skeleton className="h-4 w-20" />
										</TableCell>
									)}
									{columnVisibility.earnings && (
										<TableCell>
											<Skeleton className="h-4 w-20" />
										</TableCell>
									)}
									{columnVisibility.activityLevel && (
										<TableCell>
											<div className="flex items-center gap-2">
												<Skeleton className="h-2 w-24 rounded-full" />
												<Skeleton className="h-4 w-12" />
											</div>
										</TableCell>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			))}
			{withFooter && (
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-8 w-16" />
						<Skeleton className="h-4 w-16" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-20" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-8 w-20" />
					</div>
				</div>
			)}
		</div>
	);
}
