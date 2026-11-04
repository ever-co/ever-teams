/**
 * Gauzy gives users, teams and organizations without a picture a dummyimage.com placeholder, a letter on a flat
 * colour (`https://dummyimage.com/330x300/8b72ff/ffffff.jpg&text=A`). The UI draws its own initials tile from that
 * colour and letter instead of showing the flat image.
 */
const GENERATED_AVATAR_PATTERN =
	/dummyimage\.com\/\d+x\d+\/([0-9a-f]{3,8})\/[0-9a-f]{3,8}\.[a-z]+(?:[&?]text=([^&?#]*))?/i;

export interface GeneratedAvatar {
	color: string;
	text: string;
}

function decodedText(rawText: string | undefined) {
	if (!rawText) {
		return '';
	}
	try {
		return decodeURIComponent(rawText.replace(/\+/g, ' ')).trim();
	} catch {
		return rawText.trim();
	}
}

export function parseGeneratedAvatar(url: string | null | undefined): GeneratedAvatar | null {
	if (!url) {
		return null;
	}
	const match = GENERATED_AVATAR_PATTERN.exec(url);
	if (!match) {
		return null;
	}
	return {
		color: `#${match[1]}`,
		text: decodedText(match[2])
	};
}
