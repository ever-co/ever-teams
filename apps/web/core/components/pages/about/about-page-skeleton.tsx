/** The About page while its code loads: the product card, the two detail cards and the links column. */
export function AboutPageSkeleton() {
	const block = 'animate-pulse rounded-2xl bg-foreground/[0.04]';
	return (
		<div aria-hidden="true" className="flex h-full flex-col gap-4 p-4">
			<div className="h-7 w-32 animate-pulse rounded-md bg-foreground/[0.06]" />
			<div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
				<div className="flex flex-col gap-4">
					<div className={`${block} h-32`} />
					<div className={`${block} h-44`} />
					<div className={`${block} h-72`} />
				</div>
				<div className="flex flex-col gap-4">
					<div className={`${block} h-48`} />
					<div className={`${block} h-80`} />
				</div>
			</div>
		</div>
	);
}
