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

async function readIconFile(uri: string): Promise<string> {
	const response = await fetch(uri);
	// fetch resolves on an error status too: an error page must not be kept as the icon
	if (!response.ok) {
		throw new Error(`icon ${uri} answered ${response.status}`);
	}
	return response.text();
}

function iconFileOf(uri: string): Promise<string> {
	let file = iconFiles.get(uri);
	if (!file) {
		file = readIconFile(uri);
		iconFiles.set(uri, file);
	}
	return file;
}

interface LoadedIcon {
	uri: string;
	xml: string;
}

/** The tinted file of this address, or none while it loads, fails or still belongs to a previous address. */
function iconXmlFor(loaded: LoadedIcon | null, uri: string): string | null {
	if (loaded?.uri === uri) {
		return loaded.xml;
	}
	return null;
}

interface TintedIconProps {
	uri: string;
	color: string;
	size: number;
}

/** An icon from the API drawn in the given color; its room stays empty while the file loads or if it fails. */
export function TintedIcon({ uri, color, size }: Readonly<TintedIconProps>) {
	// the file is kept with its address: after the address changes, the old icon is never shown for the new one
	const [loaded, setLoaded] = useState<LoadedIcon | null>(null);

	useEffect(() => {
		let current = true;
		const load = async () => {
			try {
				const file = await iconFileOf(uri);
				if (current) {
					setLoaded({ uri, xml: tintIconXml(file) });
				}
			} catch {
				// a failed read is dropped, so the next screen that shows the icon asks for it again
				iconFiles.delete(uri);
			}
		};
		load();
		return () => {
			current = false;
		};
	}, [uri]);

	const iconOfThisUri = iconXmlFor(loaded, uri);
	if (!iconOfThisUri) {
		return <View testID="tinted-icon-pending" style={{ width: size, height: size }} />;
	}
	return <SvgXml testID="tinted-icon" xml={iconOfThisUri} width={size} height={size} color={color} />;
}
