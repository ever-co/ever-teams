/** The page while its code or its first data loads: the tree pane and the page outline. */
export function DocsPageSkeleton() {
	const rows = [80, 60, 72, 48, 66, 56];
	return (
		<div aria-hidden="true" className="flex h-full min-h-0">
			<div className="hidden w-72 shrink-0 border-r border-border p-3 lg:block">
				<div className="mb-3 h-8 animate-pulse rounded-md bg-foreground/[0.06]" />
				<div className="flex flex-col gap-2">
					{rows.map((width, at) => (
						<div key={at} className="h-6 animate-pulse rounded-md bg-foreground/[0.05]" style={{ width: `${width}%` }} />
					))}
				</div>
			</div>
			<div className="flex min-w-0 flex-1 flex-col px-6 py-6 lg:px-12">
				<div className="mb-6 h-4 w-40 animate-pulse rounded-md bg-foreground/[0.05]" />
				<div className="mb-6 h-9 w-2/3 animate-pulse rounded-md bg-foreground/[0.07]" />
				<div className="flex flex-col gap-3">
					{rows.map((width, at) => (
						<div key={at} className="h-4 animate-pulse rounded-md bg-foreground/[0.05]" style={{ width: `${width}%` }} />
					))}
				</div>
			</div>
		</div>
	);
}
