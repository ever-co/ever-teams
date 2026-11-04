'use client';

import dynamic from 'next/dynamic';
import { SpinnerLoader } from './loader';

/** The picker and its emoji dataset (over 400 KB) are fetched on first use, never with the page. */
export const loadEmojiPicker = () => Promise.all([import('@emoji-mart/react'), import('@emoji-mart/data')]);

/**
 * emoji-mart's picker with its dataset resolved before it mounts: the library's own async `data` would mount an
 * empty picker first.
 */
export const LazyEmojiPicker = dynamic(
	() =>
		loadEmojiPicker().then(
			([{ default: Picker }, { default: data }]) =>
				function EmojiMartPicker(props: Record<string, unknown>) {
					return <Picker data={data} {...props} />;
				}
		),
	{ ssr: false, loading: () => <SpinnerLoader size={20} /> }
);
