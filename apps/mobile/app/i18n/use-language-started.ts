import { useEffect, useState } from 'react';
import { languageStarted } from './i18n';

/**
 * Whether the app's language shows: the first screen waits for it, so it never shows in another language first. A start
 * that fails lets the app show, as it did before the wait.
 */
export function useLanguageStarted(): boolean {
	const [started, setStarted] = useState(false);
	useEffect(() => {
		let mounted = true;
		const show = () => {
			if (mounted) {
				setStarted(true);
			}
		};
		void languageStarted.then(show, show);
		return () => {
			mounted = false;
		};
	}, []);
	return started;
}
