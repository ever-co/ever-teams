/** The files section while it reads the attached files: two file-row placeholders. */
export function EntityFilesLoadingRows() {
	return (
		<div className="flex flex-col gap-1.5" aria-hidden="true">
			<div className="h-11 w-full animate-pulse rounded-lg bg-foreground/5" />
			<div className="h-11 w-2/3 animate-pulse rounded-lg bg-foreground/5" />
		</div>
	);
}
