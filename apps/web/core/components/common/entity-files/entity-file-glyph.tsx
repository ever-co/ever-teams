import type { ReactNode } from 'react';
import { HueIconTile, type GlyphHue } from '@/core/components/common/value-glyphs';
import {
	FileAudio,
	FileDoc,
	FilePdf,
	FileSheet,
	FileSlides,
	FileText,
	FileZip,
	Image as ImageIcon,
	Video
} from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { FileKind } from '@/core/lib/utils/entity-files';

const FILE_HUES: Record<FileKind, GlyphHue> = {
	image: 'info',
	pdf: 'destructive',
	sheet: 'success',
	doc: 'primary',
	slides: 'warning',
	archive: 'neutral',
	audio: 'info',
	video: 'primary',
	text: 'neutral',
	other: 'neutral'
};

const FILE_ICONS: Record<FileKind, ReactNode> = {
	image: <ImageIcon />,
	pdf: <FilePdf />,
	sheet: <FileSheet />,
	doc: <FileDoc />,
	slides: <FileSlides />,
	archive: <FileZip />,
	audio: <FileAudio />,
	video: <Video />,
	text: <FileText />,
	other: <FileText />
};

const GLYPH_SIZES = {
	md: undefined,
	sm: 'size-5 rounded-[6px] [&_svg]:size-3'
} as const;

/** A file's kind as the app's 3D label: a tile in the kind's hue holding its icon. */
export function FileGlyph({ kind, size = 'md' }: Readonly<{ kind: FileKind; size?: keyof typeof GLYPH_SIZES }>) {
	return (
		<HueIconTile hue={FILE_HUES[kind]} className={cn(GLYPH_SIZES[size])}>
			{FILE_ICONS[kind]}
		</HueIconTile>
	);
}
