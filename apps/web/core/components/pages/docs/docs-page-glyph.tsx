import { FileText, Folder } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { EDocumentKind, type IDocumentPage } from '@/core/types/interfaces/common/docs';

/** What stands before a page's title in a list: its emoji, or the glyph of its kind (a folder, a page). */
export function DocsPageGlyph({ page, className }: Readonly<{ page: Pick<IDocumentPage, 'icon' | 'kind'>; className?: string }>) {
	return (
		<span className={cn('flex size-5 shrink-0 items-center justify-center text-[15px] leading-none', className)} aria-hidden="true">
			{page.icon ? page.icon : page.kind === EDocumentKind.FOLDER ? <Folder className="size-4 text-muted-foreground" /> : <FileText className="size-4 text-muted-foreground" />}
		</span>
	);
}
