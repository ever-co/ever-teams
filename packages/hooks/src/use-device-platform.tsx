import { useState, useEffect } from 'react';

/* -------------------------------------------------------------------------- */
/*                                Types                                        */
/* -------------------------------------------------------------------------- */

/**
 * Structure representing detected platform information.
 */
export interface PlatformInfo {
	isMobile: boolean;
	platform: 'Windows' | 'MacOS' | 'Linux' | 'Unknown';
}

/* -------------------------------------------------------------------------- */
/*                                Hook                                         */
/* -------------------------------------------------------------------------- */

/**
 * React Hook to detect the user's platform (Windows, MacOS, Linux, Mobile).
 *
 * Automatically detects during client-side mount.
 *
 * @returns PlatformInfo object with:
 * - isMobile: boolean (true if device is mobile)
 * - platform: platform string ("Windows" | "MacOS" | "Linux" | "Unknown")
 *
 * @example
 * const { isMobile, platform } = useDevicePlatform();
 * console.log(isMobile); // true or false
 * console.log(platform); // "Windows" | "MacOS" | "Linux" | "Unknown"
 */
export const useDevicePlatform = (): PlatformInfo => {
	const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
		isMobile: false,
		platform: 'Unknown',
	});

	useEffect(() => {
		if (typeof window === 'undefined') return; // SSR safety

		const detectPlatform = (): PlatformInfo => {
			const userAgent = navigator.userAgent;
			const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

			if (isMobile) {
				return { isMobile: true, platform: 'Unknown' };
			}

			if (userAgent.includes('Win')) {
				return { isMobile: false, platform: 'Windows' };
			}

			if (userAgent.includes('Mac')) {
				return { isMobile: false, platform: 'MacOS' };
			}

			if (userAgent.includes('Linux')) {
				return { isMobile: false, platform: 'Linux' };
			}

			return { isMobile: false, platform: 'Unknown' };
		};

		const detectedPlatform = detectPlatform();
		setPlatformInfo(detectedPlatform);
	}, []);

	return platformInfo;
};
