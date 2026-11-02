'use client';

import { useId, useState, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { HexColorPicker } from 'react-colorful';
import { EntityTile } from '@/core/components/common/entity-tile';
import { MENU_ROW, MENU_ROW_DESTRUCTIVE, MENU_SEPARATOR } from '@/core/components/common/menu-recipes';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Camera, Check, Cube, ImagePlus, Plus, Trash } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { PROJECT_COLOR_SWATCHES } from '@/core/lib/utils/project-composer';
import { PANEL_LABEL } from './composer-recipes';

interface ProjectTilePickerProps {
	name: string;
	color: string | null;
	imageUrl: string | null;
	onColorChange: (color: string) => void;
	onImagePick: (file: File) => void;
	onImageRemove: () => void;
	size?: 'md' | 'lg';
}

const TILE_SIZE = {
	md: 'size-9 rounded-[10px] text-xs',
	lg: 'size-11 rounded-[12px] text-sm'
} as const;

function isSameColor(left: string | null, right: string) {
	if (!left) {
		return false;
	}
	return left.toLowerCase() === right.toLowerCase();
}

function isCustomColor(color: string | null) {
	if (!color) {
		return false;
	}
	const isSwatch = PROJECT_COLOR_SWATCHES.some((swatch) => isSameColor(color, swatch));
	return !isSwatch;
}

function customSwatchStyle(color: string | null, hasCustomColor: boolean) {
	if (!hasCustomColor) {
		return undefined;
	}
	return { backgroundColor: color ?? undefined };
}

export function ProjectTileFace({
	name,
	color,
	imageUrl,
	size
}: Readonly<{ name: string; color: string | null; imageUrl: string | null; size: 'md' | 'lg' }>) {
	const hasName = name.trim().length > 0;
	const hasLook = hasName || Boolean(color) || Boolean(imageUrl);
	if (!hasLook) {
		return (
			<span
				className={cn(
					'keycap-3d inline-flex items-center justify-center text-muted-foreground [&_svg]:size-4',
					TILE_SIZE[size]
				)}
			>
				<Cube />
			</span>
		);
	}
	return <EntityTile name={name} color={color} imageUrl={imageUrl} className={TILE_SIZE[size]} />;
}

function Swatch({
	color,
	isSelected,
	label,
	onPick
}: Readonly<{ color: string; isSelected: boolean; label: string; onPick: () => void }>) {
	return (
		<button
			type="button"
			onClick={onPick}
			aria-label={label}
			aria-pressed={isSelected}
			style={{ backgroundColor: color }}
			className={cn(
				'relative inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-white outline-none hairline-ring ring-black/10 transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-3.5 [&_svg]:stroke-[2.5]',
				isSelected && 'ring-2 ring-foreground/70 ring-offset-2 ring-offset-popover'
			)}
		>
			{isSelected && <Check aria-hidden="true" />}
		</button>
	);
}

export function ProjectTilePicker({
	name,
	color,
	imageUrl,
	onColorChange,
	onImagePick,
	onImageRemove,
	size = 'lg'
}: ProjectTilePickerProps) {
	const t = useTranslations();
	const fileInputId = useId();
	const [showsCustomColor, setShowsCustomColor] = useState(() => isCustomColor(color));
	const hasImage = Boolean(imageUrl);
	const hasCustomColor = isCustomColor(color);
	const customPreviewColor = color ?? PROJECT_COLOR_SWATCHES[0];

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) {
			return;
		}
		onImagePick(file);
	};

	return (
		<Popover>
			<PopoverTrigger
				aria-label={t('pages.projects.modals.tile.change')}
				className="group/tile relative inline-flex w-fit shrink-0 cursor-pointer rounded-[12px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<ProjectTileFace name={name} color={color} imageUrl={imageUrl} size={size} />
				<span
					aria-hidden="true"
					className="absolute -right-1 -bottom-1 inline-flex size-4.5 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm shadow-black/10 hairline-ring ring-border transition-colors group-hover/tile:text-foreground [&_svg]:size-2.5"
				>
					<Camera />
				</span>
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={6} className="flex w-64 flex-col gap-3 p-3">
				<div className="flex flex-col gap-2">
					<span className={PANEL_LABEL}>{t('pages.projects.modals.tile.color')}</span>
					<div className="grid grid-cols-6 gap-2">
						{PROJECT_COLOR_SWATCHES.map((swatch) => (
							<Swatch
								key={swatch}
								color={swatch}
								label={swatch}
								isSelected={isSameColor(color, swatch)}
								onPick={() => onColorChange(swatch)}
							/>
						))}
						<button
							type="button"
							onClick={() => setShowsCustomColor((shown) => !shown)}
							aria-expanded={showsCustomColor}
							aria-label={t('pages.projects.modals.tile.customColor')}
							style={customSwatchStyle(color, hasCustomColor)}
							className={cn(
								'inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-3.5',
								!hasCustomColor &&
									'hairline-border border-dashed border-foreground/30 hover:bg-foreground/5',
								hasCustomColor &&
									'text-white ring-2 ring-foreground/70 ring-offset-2 ring-offset-popover'
							)}
						>
							{!hasCustomColor && <Plus aria-hidden="true" />}
							{hasCustomColor && <Check aria-hidden="true" />}
						</button>
					</div>
					{showsCustomColor && (
						<div className="flex flex-col gap-2 pt-1 [&_.react-colorful]:h-32 [&_.react-colorful]:w-full">
							<HexColorPicker color={customPreviewColor} onChange={onColorChange} />
							<span className="font-mono text-xs text-muted-foreground uppercase">
								{customPreviewColor}
							</span>
						</div>
					)}
				</div>
				<div className={MENU_SEPARATOR} />
				<div className="-m-1 flex flex-col">
					<label htmlFor={fileInputId} className={MENU_ROW}>
						<ImagePlus aria-hidden="true" />
						{hasImage && t('pages.projects.modals.tile.replaceImage')}
						{!hasImage && t('pages.projects.modals.tile.uploadImage')}
					</label>
					<input
						id={fileInputId}
						type="file"
						accept="image/jpeg,image/png"
						onChange={handleFileChange}
						className="sr-only"
					/>
					{hasImage && (
						<button type="button" onClick={onImageRemove} className={cn(MENU_ROW, MENU_ROW_DESTRUCTIVE)}>
							<Trash aria-hidden="true" />
							{t('pages.projects.modals.tile.removeImage')}
						</button>
					)}
				</div>
				<p className="text-xs text-muted-foreground">{t('pages.projects.modals.tile.imageRules')}</p>
			</PopoverContent>
		</Popover>
	);
}
