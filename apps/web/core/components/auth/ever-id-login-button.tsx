'use client';

import { useTranslations } from 'next-intl';
import { EverIdWordmark } from '@/core/components/icons/ever-id-wordmark';
import { EverStar } from '@/core/components/icons/ever-star';
import { Button } from '../common/button';

/**
 * Full width (the width of the form's primary button), the height of the other sign-in buttons, and the card look of
 * the social buttons in both themes. Unlike them it does not force its icons to one size: the star and the wordmark
 * have their own.
 */
const EVER_ID_BUTTON_CLASS =
	'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 shadow-sm shadow-black/10 border border-transparent bg-card ring-1 ring-foreground/10 duration-200 hover:bg-muted/50 dark:ring-foreground/15 dark:hover:bg-muted/50 h-9 px-4 py-2 w-full text-foreground';

/**
 * "Login with Ever ID": the Ever star (spinning like the ever.works logo, still with a reduced-motion setting), the
 * words, and "Ever ID" as its wordmark. Screen readers read the same words: the wordmark is decorative and the name
 * of the provider is in the button's text. A submit button: the form around it starts the sign-in.
 */
export function EverIdLoginButton() {
	const t = useTranslations();

	return (
		<Button type="submit" variant="secondary" className={EVER_ID_BUTTON_CLASS}>
			<EverStar className="size-5 motion-safe:animate-[spin_9s_linear_infinite]" />
			<span className="inline-flex items-center gap-1.5">
				{t.rich('pages.auth.everId.LOGIN_WITH_EVER_ID', {
					wordmark: (chunks) => (
						<>
							<EverIdWordmark className="h-3.5 w-auto translate-y-px" />
							<span className="sr-only">{chunks}</span>
						</>
					)
				})}
			</span>
		</Button>
	);
}
