import { Skeleton } from '@/core/components/common/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';

export function ProjectListSkeleton() {
	return (
		<div className="w-full">
			<div className="overflow-x-auto rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[30px]">
								<Skeleton className="h-4 w-4" />
							</TableHead>
							<TableHead className="w-[200px]">
								<Skeleton className="h-4 w-32" />
							</TableHead>
							<TableHead>
								<Skeleton className="h-4 w-24" />
							</TableHead>
							<TableHead>
								<Skeleton className="h-4 w-24" />
							</TableHead>
							<TableHead>
								<Skeleton className="h-4 w-24" />
							</TableHead>
							<TableHead>
								<Skeleton className="h-4 w-24" />
							</TableHead>
							<TableHead className="w-[100px]">
								<Skeleton className="h-4 w-16" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 10 }).map((_, index) => (
							<TableRow key={index}>
								<TableCell>
									<Skeleton className="h-4 w-4" />
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-3">
										<Skeleton className="size-8 rounded-md" />
										<Skeleton className="h-4 w-24" />
									</div>
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-16 rounded-sm" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-20" />
								</TableCell>
								<TableCell>
									<div className="flex -space-x-2">
										{Array.from({ length: 3 }).map((_, i) => (
											<Skeleton key={i} className="size-8 rounded-full ring-2 ring-card" />
										))}
									</div>
								</TableCell>
								<TableCell>
									<div className="flex -space-x-2">
										{Array.from({ length: 2 }).map((_, i) => (
											<Skeleton key={i} className="size-8 rounded-full ring-2 ring-card" />
										))}
									</div>
								</TableCell>
								<TableCell>
									<div className="flex gap-2">
										<Skeleton className="size-7" />
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
