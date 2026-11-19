import React, { ReactNode } from 'react';
import { TintedIcon } from './tinted-icon';

interface ChipIconProps {
	item?: { iconUrl?: string; icon?: ReactNode };
	color: string;
}

/** A chip's icon in the chip's ink: the API's icon file tinted, else the icon the value carries, else nothing. */
export function ChipIcon({ item, color }: Readonly<ChipIconProps>) {
	if (item?.iconUrl) {
		return <TintedIcon uri={item.iconUrl} color={color} size={14} />;
	}
	return <>{item?.icon ?? null}</>;
}
