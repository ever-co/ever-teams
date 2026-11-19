import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

/**
 * The icons of statuses, sizes and priorities are drawn in one dark ink (#292D32, Gauzy's default icon set), which
 * vanishes on a dark chip. The web inverts them in dark mode; here that ink becomes the chip's own, light and dark.
 * White details (the check of "done") and custom colors stay as they are.
 */
const DEFAULT_ICON_INK = /(stroke|fill)="#292D32"/gi;

export function tintIconXml(xml: string): string {
	return xml.replace(DEFAULT_ICON_INK, '$1="currentColor"');
}

const iconFiles = new Map<string, Promise<string>>();

function iconFileOf(uri: string): Promise<string> {
	let file = iconFiles.get(uri);
	if (!file) {
		file = fetch(uri).then((response) => response.text());
		iconFiles.set(uri, file);
	}
	return file;
}

interface TintedIconProps {
	uri: string;
	color: string;
	size: number;
}

/** An icon from the API drawn in the given color; its room stays empty while the file loads or if it fails. */
export function TintedIcon({ uri, color, size }: Readonly<TintedIconProps>) {
	const [xml, setXml] = useState<string | null>(null);

	useEffect(() => {
		let current = true;
		iconFileOf(uri)
			.then((file) => {
				if (current) {
					setXml(tintIconXml(file));
				}
			})
			.catch(() => {
				iconFiles.delete(uri);
			});
		return () => {
			current = false;
		};
	}, [uri]);

	if (!xml) {
		return <View testID="tinted-icon-pending" style={{ width: size, height: size }} />;
	}
	return <SvgXml testID="tinted-icon" xml={xml} width={size} height={size} color={color} />;
}
