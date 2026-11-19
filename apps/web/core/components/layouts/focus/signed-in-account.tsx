'use client';

import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Button } from '@/core/components/duplicated-components/_button';
import { FocusPanel } from '@/core/components/layouts/focus/focus-shell';
import { useAuthenticateUser } from '@/core/hooks/auth/use-authenticate-user';

function initialsOf(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters = words.slice(0, 2).map((word) => word[0] ?? '');
	return letters.join('').toUpperCase();
}

function SignedInAccountSkeleton() {
	return (
		<FocusPanel className="flex items-center gap-3" isDecorative>
			<span className="size-8 shrink-0 animate-pulse rounded-full bg-foreground/[0.07]" />
			<span className="flex min-w-0 flex-1 flex-col gap-1.5">
				<span className="h-2.5 w-20 animate-pulse rounded-full bg-foreground/[0.06]" />
				<span className="h-3 w-32 animate-pulse rounded-full bg-foreground/[0.07]" />
			</span>
			<span className="h-7 w-16 animate-pulse rounded-full bg-foreground/[0.05]" />
		</FocusPanel>
	);
}

/**
 * The account a focused page acts for, with the way out when it is not the right one. `onNotYou` runs before the
 * sign-out, for a page that wants the next sign-in to come back to it.
 */
export function SignedInAccount({ onNotYou }: Readonly<{ onNotYou?: () => void }>) {
	const t = useTranslations();
	const { user, userLoading, logOut } = useAuthenticateUser();
	const signOut = () => {
		onNotYou?.();
		void logOut();
	};
	const isUserPending = Boolean(userLoading) && !user;
	if (isUserPending) {
		return <SignedInAccountSkeleton />;
	}
	if (!user) {
		return null;
	}
	const name = user.name || user.email || '';
	return (
		<FocusPanel className="flex items-center gap-3">
			<Avatar className="size-8">
				<AvatarImage src={user.imageUrl ?? undefined} alt="" />
				<AvatarFallback>{initialsOf(name)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="text-xs text-muted-foreground">{t('pages.joinTeam.SIGNED_IN_AS')}</span>
				<span className="truncate text-[13px] font-medium text-foreground">{name}</span>
			</div>
			<Button type="button" variant="outline" size="sm" onClick={signOut}>
				{t('pages.joinTeam.NOT_YOU')}
			</Button>
		</FocusPanel>
	);
}
