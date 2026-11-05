'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/core/components/common/dropdown-menu';
import { Key, Mail } from '@/core/components/icons';
import { useAuthenticateUser } from '@/core/hooks/auth/use-authenticate-user';
import { forgetRememberedTeam } from '@/core/lib/auth/remembered-team';

const PROFILE_SETTINGS_PATH = '/settings/personal';

/** Mounted only while its menu is open, so the sign-out machinery is not kept for every switcher. */
function SignInWithCodeItem() {
	const t = useTranslations();
	const { logOut, user } = useAuthenticateUser();

	const signInWithCode = () => {
		void logOut();
		// The sign-out records the open team for the next sign-in before it waits on anything: marking the e-mail after
		// it keeps that sign-in on the list, the only place that shows the address's other workspaces
		forgetRememberedTeam(user?.email);
	};

	return (
		<DropdownMenuItem onClick={signInWithCode}>
			<Key />
			<span>{t('switchers.SIGN_IN_WITH_CODE')}</span>
		</DropdownMenuItem>
	);
}

/**
 * Gauzy lists the other accounts of an address only to an account whose address is confirmed. Until then the
 * switcher says so and offers the two ways out: confirm the address, or sign in with a code, which lists them all.
 */
function UnconfirmedAddressNotice() {
	const t = useTranslations();

	return (
		<>
			<p className="px-2 py-1.5 text-xs text-pretty text-muted-foreground">
				{t('switchers.UNCONFIRMED_ADDRESS')}
			</p>
			<DropdownMenuItem asChild>
				<NextLink href={PROFILE_SETTINGS_PATH}>
					<Mail />
					<span>{t('switchers.CONFIRM_ADDRESS')}</span>
				</NextLink>
			</DropdownMenuItem>
			<SignInWithCodeItem />
		</>
	);
}

export function NoOtherWorkspace({ isAddressUnconfirmed }: Readonly<{ isAddressUnconfirmed: boolean }>) {
	const t = useTranslations();

	if (isAddressUnconfirmed) {
		return <UnconfirmedAddressNotice />;
	}

	return <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('switchers.NO_OTHER_WORKSPACE')}</p>;
}
