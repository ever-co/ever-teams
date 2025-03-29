import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityTableSkeletonProps {
	columnVisibility: {
		member: boolean;
		project: boolean;
		task: boolean;
		trackedHours: boolean;
		earnings: boolean;
		activityLevel: boolean;
	};
}

export function ActivityTableSkeleton({ columnVisibility }: ActivityTableSkeletonProps) {
	return (
		<div className="space-y-4">
			{[1, 2].map((index) => (
				<div key={index} className="rounded-lg border bg-card text-card-foreground shadow-sm">
					<div className="flex items-center justify-between border-b p-6">
						<div className="flex items-center gap-6">
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-24" />
							</div>
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-16" />
							</div>
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-20" />
							</div>
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-12" />
							</div>
						</div>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								{columnVisibility.member && <TableHead>Member</TableHead>}
								{columnVisibility.project && <TableHead>Project</TableHead>}
								{columnVisibility.task && <TableHead>Task</TableHead>}
								{columnVisibility.trackedHours && <TableHead>Tracked Hours</TableHead>}
								{columnVisibility.earnings && <TableHead>Earnings</TableHead>}
								{columnVisibility.activityLevel && <TableHead>Activity Level</TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{[1, 2, 3].map((rowIndex) => (
								<TableRow key={rowIndex}>
									{columnVisibility.member && (
										<TableCell>
											<div className="flex items-center gap-2">
												<Skeleton className="h-8 w-8 rounded-full" />
												<Skeleton className="h-4 w-32" />
											</div>
										</TableCell>
									)}
									{columnVisibility.project && (
										<TableCell>
											<div className="flex items-center gap-2">
												<Skeleton className="h-8 w-8 rounded-full" />
												<Skeleton className="h-4 w-32" />
											</div>
										</TableCell>
									)}
									{columnVisibility.task && (
										<TableCell>
											<div className="space-y-1">
												<Skeleton className="h-4 w-48" />
												<Skeleton className="h-3 w-32" />
											</div>
										</TableCell>
									)}
									{columnVisibility.trackedHours && (
										<TableCell>
											<Skeleton className="h-4 w-16" />
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
		</div>
	);
}
