'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { EverIdWordmark } from '@/core/components/icons/ever-id-wordmark';
import { EverStar } from '@/core/components/icons/ever-star';

/**
 * The Ever brand kit's "Login with Ever ID" button (`ever-co/platform` packages/brand, README "The Login with Ever ID
 * button"): the full width of the form, 40 px, radius 8, padding 0 16px, 8 px gaps, 14/20 px at weight 500. Light: a
 * #0A0A0A button with white text (hover #262626); dark: #EDEDED with #0A0A0A text (hover #FFF). Focus ring 2 px,
 * offset 2 (#231645 light, #CC66FF dark). The same values as the kit's `.ever-id-button`, written as classes so they
 * follow this app's own theme switch instead of the kit's global tokens. The words and the wordmark wrap (the button
 * grows past 40 px) only when the text is enlarged or a translation is long, so nothing is pushed out of it.
 */
const EVER_ID_BUTTON_CLASS =
	'box-border flex w-full min-h-10 items-center justify-center gap-2 px-4 py-[9px] rounded-[8px] border text-sm leading-5 font-medium cursor-pointer select-none transition-colors duration-150 bg-[#0a0a0a] border-[#0a0a0a] text-white hover:bg-[#262626] dark:bg-[#ededed] dark:border-white/[0.09] dark:text-[#0a0a0a] dark:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231645] dark:focus-visible:outline-[#cc66ff] disabled:opacity-50 disabled:pointer-events-none';

/** The `<wordmark>` tag of the label: the drawn wordmark, and its words for screen readers. */
function renderWordmark(chunks: ReactNode) {
	return (
		<>
			<EverIdWordmark className="block h-3.5 w-auto" />
			<span className="sr-only">{chunks}</span>
		</>
	);
}

/**
 * "Login with Ever ID": the Ever star (one turn every 9 s like the Ever Works logo, still with a reduced-motion
 * setting), the words, and "Ever ID" as its wordmark. Screen readers read the same words: the star and the wordmark
 * are decorative and the name of the provider is in the button's text. A submit button: the form around it starts
 * the sign-in.
 */
export function EverIdLoginButton() {
	const t = useTranslations();

	return (
		<button type="submit" className={EVER_ID_BUTTON_CLASS}>
			<EverStar className="h-5 w-auto shrink-0 motion-safe:animate-[spin_9s_linear_infinite]" />
			<span className="inline-flex flex-wrap items-center justify-center gap-2">
				{t.rich('pages.auth.everId.LOGIN_WITH_EVER_ID', { wordmark: renderWordmark })}
			</span>
		</button>
	);
}
