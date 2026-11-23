import React, { ReactNode, useState } from 'react';
import { Image } from 'react-native';
import { TintedIcon } from './tinted-icon';
import { TaskPropertyIcon, TaskPropertyKind } from './task-property-icon';
import { isCustomIcon } from './property-icon-value';
import { dataColorHueOf } from '../theme/data-color';

const CHIP_ICON_SIZE = 14;

/** A picture file, read from the path of its address: an image the user uploaded is mostly one of these. */
const PICTURE_FILE = /\.(png|jpe?g|gif|webp)$/i;

interface ChipIconItem {
	iconUrl?: string;
	icon?: ReactNode;
	name?: string;
	bgColor?: string;
	/** The icon the value was saved with, as Gauzy stores it. */
	storedIcon?: string;
}

interface ChipIconProps {
	item?: ChipIconItem;
	color: string;
	/** What the chip shows; with it, the chip draws the web's glyph unless the value has an icon of its own. */
	kind?: TaskPropertyKind;
	/** 14 in a chip; a menu row draws its glyph at 16, as the web's menus do. */
	size?: number;
}

/**
 * The address of an icon the user gave the value, which the web draws in place of its glyph; null for a label (shown
 * by its color on the web), a classic icon Gauzy seeds, or no icon file.
 */
function ownIconUrlOf(kind: TaskPropertyKind, item: ChipIconItem | undefined): string | null {
	if (kind === 'label') {
		return null;
	}
	if (!isCustomIcon(item?.storedIcon)) {
		return null;
	}
	return item?.iconUrl ?? null;
}

function isPictureFile(uri: string): boolean {
	const [path] = uri.split(/[?#]/);
	return PICTURE_FILE.test(path);
}

interface OwnIconProps {
	uri: string;
	color: string;
	/** Drawn in place of a picture that fails to load. */
	fallback: ReactNode;
	size: number;
}

/**
 * An icon the user gave the value. A picture keeps its own colors, as on the web, and gives way to the glyph if it
 * fails to load; an SVG drawing takes the hue of the value's color.
 */
function OwnIcon({ uri, color, fallback, size }: Readonly<OwnIconProps>) {
	const [failedUri, setFailedUri] = useState<string | null>(null);
	if (!isPictureFile(uri)) {
		return <TintedIcon uri={uri} color={color} size={size} />;
	}
	const pictureSize = { height: size, width: size };
	// A failed address is not asked again; a new one (a URL signed again, another upload) is
	if (failedUri === uri) {
		return <>{fallback}</>;
	}
	return (
		<Image
			testID="chip-icon-picture"
			source={{ uri }}
			style={pictureSize}
			resizeMode="contain"
			onError={() => setFailedUri(uri)}
		/>
	);
}

/**
 * A chip's icon. With a kind, as the web draws it: the glyph of a status, priority or size, a label's dot, or the
 * value's own icon file (an SVG in the hue of its color, a picture as it is). Without one: the API's icon file in the
 * chip's ink, else the icon the value carries, else nothing.
 */
export function ChipIcon({ item, color, kind, size = CHIP_ICON_SIZE }: Readonly<ChipIconProps>) {
	if (kind) {
		const glyph = <TaskPropertyIcon kind={kind} name={item?.name} color={item?.bgColor} size={size} />;
		const ownIconUrl = ownIconUrlOf(kind, item);
		if (!ownIconUrl) {
			return glyph;
		}
		const ownIconColor = dataColorHueOf(item?.bgColor) ?? color;
		return <OwnIcon uri={ownIconUrl} color={ownIconColor} fallback={glyph} size={size} />;
	}
	if (item?.iconUrl) {
		return <TintedIcon uri={item.iconUrl} color={color} size={size} />;
	}
	return <>{item?.icon ?? null}</>;
}
