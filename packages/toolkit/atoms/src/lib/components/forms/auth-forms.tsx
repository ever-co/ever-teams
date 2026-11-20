/** @jsxImportSource theme-ui */
'use client';

import React from 'react';
import {
	Avatar,
	Card,
	Checkbox,
	cn,
	Dialog,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Tabs,
	TabsContent,
	TabsListThemed,
	TabsTrigger,
	ThemedButton
} from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTimerStatusContext } from '@lib/context/teams-timer-status-context';
// import { useLoginForm } from '@hooks/useLoginForm';
import { CheckIcon, Copy, LoaderCircle, LogOutIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { hostSessionAtom } from '@lib/session/host-session';
import { useTranslation } from 'react-i18next';
import { SpinOverlayLoader } from '../loaders/spin-overlay-loader';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { logOut as teamsLogOut } from '@ever-teams/api';
import { TeamsPasswordLoginForm } from './teams-password-login-form';
import { TeamsTokenLoginForm } from './teams-token-login-form';
import { KitFormError, KitFormField } from './kit-form-field';
import { KIT_NOTICE_SURFACE, kitNoticeTone } from '@components/teams-ui-components/notice-surface';
import { useKitOptions } from '@components/teams-provider/kit-root';
import { warnOnce } from '@lib/utils/warn-once';
import { useRegistrationForm } from '@hooks/useRegistrationForm';
import { useClearKitSession } from '@hooks/useClearKitSession';
import { forgetStoredSession } from '@lib/session/stored-session';
import { apiUrlOf } from '@lib/utils/api-url';
import { useSiteSignIn } from '@lib/session/site-sign-in-context';
import { SiteSignInButton } from './site-sign-in-button';

/**
 * What a signed-out person sees when the host signs people in from its backend (config.getToken): the kit asks for no
 * password or token, it points to the host product's own sign-in. Nothing while the host's first answer is pending.
 */
const HostSignInNote = ({ className }: { className?: string }) => {
	const { t } = useTranslation();
	const { status } = useAtomValue(hostSessionAtom);
	if (status !== 'signed-out') {
		return null;
	}
	return (
		<p role="status" className={cn('max-w-xs', KIT_NOTICE_SURFACE, kitNoticeTone('neutral'), className)}>
			{t('AUTH.host_sign_in')}
		</p>
	);
};

/**
 * The "Sign in with Ever Teams" button (config.signIn 'ever-teams'), else the note that points to the host product's
 * own sign-in.
 */
const SignInPrompt = ({ className }: { className?: string }) => {
	const { siteSignIn } = useKitOptions();
	if (siteSignIn) {
		return <SiteSignInButton className={className} />;
	}
	return <HostSignInNote className={className} />;
};

/**
 * What a signed-out person sees when the kit asks for no password or token. Signed out while the timer ran, it also
 * says that the timer runs on in Ever Teams, where this page can no longer stop it (#5583).
 */
const SignedOutPrompt = ({ className }: { className?: string }) => {
	const { t } = useTranslation();
	const { status } = useAtomValue(hostSessionAtom);
	const timerStatus = useTimerStatusContext();
	const isSignedOut = status === 'signed-out';
	const wasRunning = Boolean(timerStatus?.leftRunning);
	if (!isSignedOut || !wasRunning) {
		return <SignInPrompt className={className} />;
	}
	return (
		<div className={cn('flex max-w-xs flex-col items-start gap-2', className)}>
			<SignInPrompt />
			<p role="alert" className={cn(KIT_NOTICE_SURFACE, kitNoticeTone('error'))}>
				{t('AUTH.timer_left_running')}
			</p>
		</div>
	);
};

// The name a person goes by in the kit: first and last name, or "" without one. Never the email: these names go into
// attributes (aria-label, alt) that a host page's scripts and session recordings read even when no menu is open.
function fullNameOf(user: { firstName?: string; lastName?: string }): string {
	return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

// The sign-in form can switch to the registration form and back, in place.
type AuthFormMode = 'signin' | 'signup';

type FormSource = 'storybook' | 'example';

// The links of the sign-in and registration forms: the theme's primary, lighter in dark mode to stay readable there.
const AUTH_LINK =
	'cursor-pointer font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none dark:text-primary-xlight';
// The same link on a button, for the switch between the two forms.
const AUTH_LINK_BUTTON = cn('border-none bg-transparent p-0 font-inherit', AUTH_LINK);

// The title of the sign-in and registration forms, above a separator.
function AuthFormTitle({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<div className="mb-4 border-b border-border pb-4 text-foreground">
			<h1 className="text-xl font-semibold">{children}</h1>
		</div>
	);
}

/**
 * A component to display the user's avatar with a popover menu.
 *
 * This component uses the current authenticated user's information
 * from Teams Provider to display an avatar image. If the user is loading,
 * a loading spinner is shown. When the avatar is clicked, a popover
 * menu is displayed with further navigation options.
 *
 * @returns {React.JSX.Element | null} The user's avatar and popover menu
 * or null if the user is not authenticated.
 */

const TeamsUserAvatar = ({
	children,
	showMenu = true,
	position
}: {
	children?: React.ReactNode;
	showMenu?: boolean;
	position?: 'center' | 'end' | 'start';
}) => {
	const {
		authenticatedUser: user,
		loadings: { userLoading }
	} = useTeamsContext();
	const { t } = useTranslation();

	if (!user) return null;

	const name = fullNameOf(user);
	let accountMenuLabel = t('AUTH.account_menu_unnamed');
	if (name) {
		accountMenuLabel = t('AUTH.account_menu', { name });
	}

	if (showMenu)
		return (
			<Popover>
				<PopoverTrigger className="relative px-3 outline-hidden" aria-label={accountMenuLabel}>
					{userLoading && <SpinOverlayLoader />}
					<Avatar
						alt=""
						title={
							(user.firstName ? user.firstName[0] : '') + ' ' + (user.lastName ? user.lastName[0] : '')
						}
						fallback={(user.firstName ? user.firstName[0] : '') + (user.lastName ? user.lastName[0] : '')}
						src={user.imageUrl}
					/>
				</PopoverTrigger>

				<PopoverContent
					align={position}
					className="z-[1000] w-64 rounded-xl  text-sm/6 transition duration-200 ease-in-out"
				>
					<UserNavMenu>{children}</UserNavMenu>
				</PopoverContent>
			</Popover>
		);

	return (
		<Avatar
			alt={name}
			title={(user.firstName ? user.firstName[0] : '') + ' ' + (user.lastName ? user.lastName[0] : '')}
			fallback={(user.firstName ? user.firstName[0] : '') + (user.lastName ? user.lastName[0] : '')}
			src={user.imageUrl}
		/>
	);
};

/**
 * A login form component for Teams.
 *
 * @prop {string} [className] - The CSS class name for the component.
 * @prop {React.ForwardedRef<HTMLDivElement>} [ref] - A reference to the component.
 *
 * @example
 * <TeamsLoginForm />
 *
 * @returns {JSX.Element} The login form component.
 */
const TeamsLoginForm = ({
	ref,
	className,
	signupLink,
	redirectHandler,
	onModeChange
}: {
	source?: FormSource;
	className?: string;
	ref?: React.ForwardedRef<HTMLDivElement>;
	signupLink?: string;
	redirectHandler?: () => void;
	// Called when the form switches to registration or back (the dialogs name themselves after the form shown)
	onModeChange?: (mode: AuthFormMode) => void;
}) => {
	// const { } = useTeamsContext();
	const [mode, setMode] = useState<AuthFormMode>('signin');
	const switchTo = (next: AuthFormMode) => {
		setMode(next);
		onModeChange?.(next);
	};

	const { t } = useTranslation();
	const { hostSignIn } = useKitOptions();

	// The password and token tabs put an Ever Teams credential into the page: fine on the workspace's own pages, not on a
	// third-party site, where the host should sign people in from its backend.
	useEffect(() => {
		if (hostSignIn) {
			return;
		}
		warnOnce(
			'password-sign-in',
			'the password and token sign-in ask for an Ever Teams credential inside this page. On a site that is not your own, pass config.getToken to sign people in from your backend (README: "Sign in from your backend"), or config.signIn \'ever-teams\' on a site without a server (README: "Sign in with Ever Teams").'
		);
	}, [hostSignIn]);

	if (hostSignIn) {
		return <SignedOutPrompt className={className} />;
	}

	return mode === 'signin' ? (
		<div ref={ref} className={className}>
			<AuthFormTitle>{t('AUTH.sign_in_title')}</AuthFormTitle>
			<Tabs className="flex flex-col gap-3 transition-all delay-200" defaultValue="password">
				<TabsListThemed className="grid grid-cols-2 h-10 text-white bg-opacity-20">
					<TabsTrigger value="password">{t('COMMON.password')}</TabsTrigger>
					<TabsTrigger value="token">{t('COMMON.token')}</TabsTrigger>
				</TabsListThemed>
				<TabsContent value="password">
					<TeamsPasswordLoginForm redirectHandler={redirectHandler} />
				</TabsContent>
				<TabsContent value="token">
					<TeamsTokenLoginForm redirectHandler={redirectHandler} />
				</TabsContent>
			</Tabs>

			<p className="pt-3 text-sm text-muted-foreground">
				{t('AUTH.dont_have_an_account')}{' '}
				{signupLink ? (
					<a className={AUTH_LINK} href={signupLink}>
						{t('AUTH.sign_up_title')}
					</a>
				) : (
					<button type="button" className={AUTH_LINK_BUTTON} onClick={() => switchTo('signup')}>
						{t('AUTH.sign_up_title')}
					</button>
				)}
			</p>

			<TeamsTimerFooter className="mt-2" />
		</div>
	) : (
		<TeamsRegistrationForm className={className} redirectHandler={redirectHandler} onModeChange={onModeChange} />
	);
};

/**
 * A component to display a login dialog.
 *
 * This component displays a dialog with a login form when the user is not authenticated.
 * If the user is authenticated, the component displays the user's avatar.
 *
 * @prop {React.ReactNode} [trigger] - The trigger element to display the dialog.
 * If not provided, a button labelled with the kit's translation of Sign In is displayed.
 *
 * @returns {React.ReactNode} The dialog component.
 */
const TeamsLoginDialog = ({
	trigger,
	signupLink,
	redirectHandler,
	position
}: {
	trigger?: React.ReactNode;
	position?: 'start' | 'center' | 'end';
	signupLink?: string;
	redirectHandler?: () => void;
}) => {
	const { authenticatedUser: user } = useTeamsContext();
	const { hostSignIn } = useKitOptions();
	const { t } = useTranslation();
	// The form shown, for the dialog's title; a closed dialog opens on the sign-in form again.
	const [mode, setMode] = useState<AuthFormMode>('signin');
	const title = mode === 'signin' ? t('AUTH.sign_in_title') : t('AUTH.sign_up_title');

	// The host signs people in: no dialog to open, only the note while the person is signed out of the host product.
	if (hostSignIn && !user) {
		return <SignedOutPrompt />;
	}

	return (
		<div>
			{!user ? (
				<Dialog
					trigger={trigger || <ThemedButton className="min-w-28">{t('AUTH.sign_in_title')}</ThemedButton>}
					title={title}
					hideTitle
					onOpenChange={(open) => {
						if (!open) {
							setMode('signin');
						}
					}}
				>
					<TeamsLoginForm redirectHandler={redirectHandler} signupLink={signupLink} onModeChange={setMode} />
				</Dialog>
			) : (
				<TeamsUserAvatar position={position} />
			)}
		</div>
	);
};

TeamsLoginForm.displayName = 'TeamsLoginForm';

export function MenuIndicator() {
	return (
		<Card
			className={cn(
				'absolute top-4 bg-transparent -z-10 dark:bg-transparent',
				'nav-items--shadow rounded-none !py-0 !px-0',
				'w-0 h-0',
				'border-l-[15px] border-r-[15px]',
				'xl:border-l-[35px] border-l-transparent xl:border-r-[35px] border-r-transparent',
				'border-solid border-b-light--theme-light dark:border-b-dark--theme-light border-b-[50px]'
			)}
		/>
	);
}

export const UserNavMenu = ({ children }: { children?: React.ReactNode }) => {
	const { authenticatedUser: user, token } = useTeamsContext();
	const { onSignOut, scoped, hostSignIn, api } = useKitOptions();
	const siteSignIn = useSiteSignIn();
	const clearSession = useClearKitSession();
	const { t } = useTranslation();
	// Signed in with Ever Teams, the person signs out here; signed in by the host, with the host product.
	const offersSignOut = !hostSignIn || siteSignIn !== null;

	const logOut = async () => {
		// The sign-in with Ever Teams ends at the API, then here: the widgets show the button again, on the same page.
		if (siteSignIn) {
			await siteSignIn.signOut();
			onSignOut?.();
			return;
		}
		if (typeof window !== 'undefined') {
			await teamsLogOut(token, api);

			// Only this server's session: the providers of other servers stay signed in.
			forgetStoredSession(apiUrlOf(api));
			// The kit forgets the account at once: the widgets show their signed-out state without a reload.
			clearSession();
			if (onSignOut) {
				onSignOut();
				return;
			}
			// Without a callback, only a kit drawn inside its own root leaves the host's page where it is.
			if (scoped) {
				return;
			}
			warnOnce(
				'sign-out-redirect',
				"after a sign-out the kit sends the browser to '/'. Pass <TeamsProvider onSignOut> to choose what happens; with scopedStyles the kit stays on the page."
			);
			window.location.href = '/';
		}
	};

	// Signed out while the menu stays on the page (scopedStyles, onSignOut): there is no user to show.
	if (!user) {
		return null;
	}

	return (
		<div className="text-sm text-gray-800 dark:text-gray-100">
			<div className="flex flex-col gap-3 justify-center items-center pb-3 space-x-3 border-b dark:border-gray-700">
				<Avatar
					alt=""
					title={
						(user!.firstName ? user!.firstName[0] : '') + ' ' + (user!.lastName ? user!.lastName[0] : '')
					}
					fallback={(user!.firstName ? user!.firstName[0] : '') + (user!.lastName ? user!.lastName[0] : '')}
					src={user!.imageUrl}
					className="object-cover rounded-full size-14"
				/>

				<div className="flex flex-col gap-1 justify-center items-center">
					<p className="font-semibold">
						{user?.firstName} {user?.lastName}
					</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>

					{/* The host's token stays out of sight: it signs the person out with the host product, not here. */}
					{!hostSignIn && <TokenDisplay token={`${token}`} />}
				</div>
			</div>

			{children}

			{offersSignOut && (
				<ul className="pt-3 space-y-2 w-full border-t dark:border-gray-700">
					{/* Logout menu */}
					<li>
						<button className="flex space-x-3 items-center font-normal text-[#DE437B]" onClick={logOut}>
							<LogOutIcon className="w-5 h-5 stroke-[#DE437B]" />{' '}
							<span>{t('AUTH.logout').toUpperCase()}</span>
						</button>
					</li>
				</ul>
			)}
		</div>
	);
};

export const TokenDisplay = ({ token }: { token: string }) => {
	const [isCopied, setIsCopied] = useState(false);
	const truncatedToken = token.length > 30 ? `${token.slice(0, 15)}...${token.slice(16, 30)}` : token;

	const handleCopy = () => {
		navigator.clipboard
			.writeText(token)
			.then(() => {
				setIsCopied(true);
				setTimeout(() => setIsCopied(false), 2000);
			})
			.catch((err) => console.error('Failed to copy: ', err));
	};

	const icon = isCopied ? <CheckIcon className="size-4" /> : <Copy className="size-4" />;

	return (
		<div className="flex gap-2 text-xs text-gray-500">
			<span>{truncatedToken}...</span>
			<button onClick={handleCopy} className="copy-button">
				{icon}
			</button>
		</div>
	);
};

const TeamsRegistrationForm = ({
	signInLink,
	redirectHandler,
	className,
	onModeChange
}: {
	signInLink?: string;
	redirectHandler?: () => void;
	className?: string;
	// Called when the form switches to sign-in or back (the dialogs name themselves after the form shown)
	onModeChange?: (mode: AuthFormMode) => void;
}) => {
	const [mode, setMode] = useState<AuthFormMode>('signup');
	const switchTo = (next: AuthFormMode) => {
		setMode(next);
		onModeChange?.(next);
	};
	const form = useRegistrationForm(redirectHandler);
	const { t } = useTranslation();

	return mode === 'signup' ? (
		<form onSubmit={form.handleSubmit} className={cn('flex flex-col gap-4 w-full', className)}>
			<AuthFormTitle>{t('AUTH.sign_up_title')}</AuthFormTitle>

			<KitFormField
				label={t('COMMON.full_name')}
				required
				onChange={form.handleInputChange}
				placeholder={t('AUTH.full_name_prompt')}
				value={form.formData.fullName}
				size={30}
				type="text"
				name="fullName"
			/>

			<KitFormField
				label={t('COMMON.email')}
				required
				onChange={form.handleInputChange}
				placeholder={t('AUTH.email_prompt')}
				value={form.formData.email}
				size={30}
				type="email"
				name="email"
			/>

			<KitFormField
				label={t('COMMON.password')}
				required
				onChange={form.handleInputChange}
				placeholder={t('AUTH.password_prompt')}
				value={form.formData.password}
				size={30}
				type="password"
				name="password"
			/>

			<KitFormField
				label={t('AUTH.confirm_password_prompt')}
				required
				onChange={form.handleInputChange}
				placeholder={t('AUTH.confirm_password_prompt')}
				value={form.formData.confirmPassword}
				size={30}
				name="confirmPassword"
				type="password"
			/>

			<div className="flex mt-2 space-x-2 items-top">
				<Checkbox
					required
					id="terms"
					onCheckedChange={form.handleCheckboxChange}
					checked={form.formData.acceptTerms}
					name="acceptTerms"
				/>
				<div className="grid gap-1.5 leading-none">
					<label
						htmlFor="terms"
						className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						<p className="text-xs text-muted-foreground">
							<span>{t('COMMON.accept')} </span>
							<a
								href={'https://ever.team/tos'}
								className="underline"
								target={'_blank'}
								rel="noopener noreferrer"
							>
								{t('COMMON.terms_and_conditions')}
							</a>
							<span> {t('COMMON.and')} </span>
							<a
								href={'https://ever.team/privacy'}
								rel="noopener noreferrer"
								className="underline"
								target={'_blank'}
							>
								{t('COMMON.privacy_policy')}
							</a>
						</p>
					</label>
				</div>
			</div>

			<KitFormError message={form.errors?.[0]} />

			<ThemedButton disabled={Boolean(form.loading || form.errors?.[0])} className="flex h-9 gap-2 mt-5">
				{form.loading && (
					<span className="animate-spin">
						<LoaderCircle />
					</span>
				)}
				{t('AUTH.sign_up_title')}
			</ThemedButton>

			<p className="pt-3 text-sm text-muted-foreground">
				{t('AUTH.have_an_account')}{' '}
				{signInLink ? (
					<a className={AUTH_LINK} href={signInLink}>
						{t('AUTH.sign_in_title')}
					</a>
				) : (
					<button className={AUTH_LINK_BUTTON} type="button" onClick={() => switchTo('signin')}>
						{t('AUTH.sign_in_title')}
					</button>
				)}
			</p>

			<TeamsTimerFooter />
		</form>
	) : (
		<TeamsLoginForm className={className} redirectHandler={redirectHandler} onModeChange={onModeChange} />
	);
};

const TeamsRegistrationDialog = ({ trigger, signInLink }: { trigger?: React.ReactNode; signInLink?: string }) => {
	const { t } = useTranslation();
	// The form shown, for the dialog's title; a closed dialog opens on the registration form again.
	const [mode, setMode] = useState<AuthFormMode>('signup');
	const title = mode === 'signup' ? t('AUTH.sign_up_title') : t('AUTH.sign_in_title');
	return (
		<Dialog
			trigger={trigger || <ThemedButton>{t('AUTH.register_now')}</ThemedButton>}
			title={title}
			hideTitle
			onOpenChange={(open) => {
				if (!open) {
					setMode('signup');
				}
			}}
		>
			<TeamsRegistrationForm signInLink={signInLink} onModeChange={setMode} />
		</Dialog>
	);
};

export { TeamsLoginForm, TeamsUserAvatar, TeamsLoginDialog, TeamsRegistrationForm, TeamsRegistrationDialog };
