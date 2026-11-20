import React, { ReactNode } from 'react';
import { TintedIcon } from './tinted-icon';
import { TaskPropertyIcon, TaskPropertyKind } from './task-property-icon';
import { isCustomIcon } from './property-icon-value';
import { dataColorHueOf } from '../theme/data-color';

const CHIP_ICON_SIZE = 14;

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

/**
 * A chip's icon. With a kind, as the web draws it: the glyph of a status, priority or size, a label's dot, or the
 * value's own icon file in the hue of its color. Without one: the API's icon file in the chip's ink, else the icon
 * the value carries, else nothing.
 */
export function ChipIcon({ item, color, kind }: Readonly<ChipIconProps>) {
	if (kind) {
		const ownIconUrl = ownIconUrlOf(kind, item);
		if (!ownIconUrl) {
			return <TaskPropertyIcon kind={kind} name={item?.name} color={item?.bgColor} size={CHIP_ICON_SIZE} />;
		}
		const ownIconColor = dataColorHueOf(item?.bgColor) ?? color;
		return <TintedIcon uri={ownIconUrl} color={ownIconColor} size={CHIP_ICON_SIZE} />;
	}
	if (item?.iconUrl) {
		return <TintedIcon uri={item.iconUrl} color={color} size={CHIP_ICON_SIZE} />;
	}
	return <>{item?.icon ?? null}</>;
}
