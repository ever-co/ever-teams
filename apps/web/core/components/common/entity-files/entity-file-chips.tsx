'use client';

import { useLocale, useTranslations } from 'next-intl';
import { X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { useOpenEntityFile } from '@/core/hooks/documents/use-entity-files';
import { fileKindOf, fileNameOf, formatFileSize } from '@/core/lib/utils/entity-files';
import type { TEntityFileLink } from '@/core/types/schemas/documents/entity-file.schema';
import { FileGlyph } from './entity-file-glyph';

const CHIP =
	'inline-flex h-7 max-w-60 items-center gap-1.5 rounded-md bg-card pl-1.5 text-xs text-foreground hairline-ring ring-border shadow-sm shadow-black/6.5';

/** The files posted with a comment, as chips that open the file in a new tab. */
export function EntityFileChips({ links }: Readonly<{ links: TEntityFileLink[] }>) {
	const t = useTranslations();
	const open = useOpenEntityFile();
	return (
		<ul className="flex flex-wrap gap-1.5" aria-label={t('entityFiles.TITLE')}>
			{links.map((link) => {
				const name = fileNameOf(link);
				const kind = fileKindOf(link.document?.mimeType, name);
				return (
					<li key={link.id}>
						<button
							type="button"
							onClick={() => void open(link)}
							title={t('entityFiles.OPEN', { name })}
							className={cn(
								CHIP,
								'pr-2 outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25'
							)}
						>
							<FileGlyph kind={kind} size="sm" />
							<span className="truncate font-medium">{name}</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

/** The files waiting in a comment field, each with its size and a way to take it out before sending. */
export function StagedFileChips({ files, onRemove }: Readonly<{ files: File[]; onRemove: (file: File) => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	return (
		<ul className="flex flex-wrap gap-1.5">
			{files.map((file, index) => {
				const kind = fileKindOf(file.type, file.name);
				const removeLabel = t('entityFiles.REMOVE', { name: file.name });
				return (
					<li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className={cn(CHIP, 'pr-0.5')}>
						<FileGlyph kind={kind} size="sm" />
						<span className="truncate font-medium">{file.name}</span>
						<span className="shrink-0 tabular-nums text-muted-foreground">
							{formatFileSize(file.size, locale)}
						</span>
						<button
							type="button"
							onClick={() => onRemove(file)}
							aria-label={removeLabel}
							title={removeLabel}
							className="flex size-6 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							<X className="size-3.5" />
						</button>
					</li>
				);
			})}
		</ul>
	);
}
