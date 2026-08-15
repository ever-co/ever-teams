/** @jsxImportSource theme-ui */
'use client';

import React from 'react';
import {
	Avatar,
	Card,
	Checkbox,
	cn,
	Dialog,
	Input,
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
// import { useLoginForm } from '@hooks/useLoginForm';
import { CheckIcon, Copy, LoaderCircle, LogOutIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SpinOverlayLoader } from '../loaders/spin-overlay-loader';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { logOut as teamsLogOut } from '@ever-teams/api';
import { TeamsPasswordLoginForm } from './teams-password-login-form';
import { TeamsTokenLoginForm } from './teams-token-login-form';
import { useRegistrationForm } from '@hooks/useRegistrationForm';

type FormSource = 'storybook' | 'example';

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

	if (!user) return null;

	if (showMenu)
		return (
			<Popover>
				<PopoverTrigger className="relative px-3 outline-hidden">
					{userLoading && <SpinOverlayLoader />}
					<Avatar
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
	redirectHandler
}: {
	source?: FormSource;
	className?: string;
	ref?: React.ForwardedRef<HTMLDivElement>;
	signupLink?: string;
	redirectHandler?: () => void;
}) => {
	// const { } = useTeamsContext();
	const [mode, setMode] = useState<'signin' | 'signup'>('signin');

	const { t } = useTranslation();

	return mode === 'signin' ? (
		<div ref={ref} className={className}>
			<div className="flex flex-col gap-4 justify-center items-start pb-4 mb-4 text-black border-b border-gray-200 dark:border-gray-800 dark:text-white">
				<h1 className="text-3xl font-bold tracking-tight">{t('AUTH.sign_in_title')}</h1>
				<p className="text-xs font-light text-gray-400"></p>
			</div>
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

			<p className="pt-3 text-sm text-slate-500 dark:text-white">
				{t('AUTH.dont_have_an_account')}{' '}
				{signupLink ? (
					<a className="text-blue-500 cursor-pointer" href={signupLink}>
						{t('AUTH.sign_up_title')}
					</a>
				) : (
					<button
						type="button"
						className="p-0 text-blue-500 bg-transparent border-none cursor-pointer font-inherit"
						onClick={() => setMode('signup')}
					>
						{t('AUTH.sign_up_title')}
					</button>
				)}
			</p>

			<TeamsTimerFooter className="mt-2" />
		</div>
	) : (
		<TeamsRegistrationForm className={className} redirectHandler={redirectHandler} />
	);
};

/**
 * A component to display a login dialog.
 *
 * This component displays a dialog with a login form when the user is not authenticated.
 * If the user is authenticated, the component displays the user's avatar.
 *
 * @prop {React.ReactNode} [trigger] - The trigger element to display the dialog.
 * If not provided, a default button with 'SIGN IN' label is displayed.
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

	return (
		<div>
			{!user ? (
				<Dialog trigger={trigger ? trigger : <ThemedButton className="min-w-28">SIGN IN</ThemedButton>}>
					<TeamsLoginForm redirectHandler={redirectHandler} signupLink={signupLink} />
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
	const { t } = useTranslation();

	const logOut = async () => {
		if (typeof window !== 'undefined') {
			await teamsLogOut(token);

			const resetStore = {
				app: { user: null },
				persist: { token: null }
			};

			window.localStorage.setItem('_teams-store', JSON.stringify(resetStore));
			window.location.href = '/';
		}
	};

	return (
		<div className="text-sm text-gray-800 dark:text-gray-100">
			<div className="flex flex-col gap-3 justify-center items-center pb-3 space-x-3 border-b dark:border-gray-700">
				<Avatar
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

					<TokenDisplay token={`${token}`} />
				</div>
			</div>

			{children}

			<ul className="pt-3 space-y-2 w-full border-t dark:border-gray-700">
				{/* Logout menu */}
				<li>
					<button className="flex space-x-3 items-center font-normal text-[#DE437B]" onClick={logOut}>
						<LogOutIcon className="w-5 h-5 stroke-[#DE437B]" />{' '}
						<span>{t('AUTH.logout').toUpperCase()}</span>
					</button>
				</li>
			</ul>
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
	className
}: {
	signInLink?: string;
	redirectHandler?: () => void;
	className?: string;
}) => {
	const [mode, setMode] = useState<'signin' | 'signup'>('signup');
	const form = useRegistrationForm(redirectHandler);
	const { t } = useTranslation();

	return mode === 'signup' ? (
		<form onSubmit={form.handleSubmit} className={cn('flex flex-col gap-2 w-full', className)}>
			<div className="flex flex-col gap-4 justify-center items-start pb-4 mb-4 text-black border-b border-gray-200 dark:border-gray-800 dark:text-white">
				<h1 className="text-3xl font-bold tracking-tight">{t('AUTH.sign_up_title')}</h1>
				<p className="text-xs font-light text-gray-400"></p>
			</div>

			<label htmlFor="full-name" className="text-sm text-slate-500 dark:text-white">
				{t('COMMON.full_name')} :
			</label>
			<Input
				required
				onChange={form.handleInputChange}
				className="border"
				placeholder={t('AUTH.full_name_prompt')}
				value={form.formData.fullName}
				size={30}
				type="text"
				name="fullName"
			/>

			<label htmlFor="email" className="text-sm text-slate-500 dark:text-white">
				{t('COMMON.email')} :
			</label>
			<Input
				required
				onChange={form.handleInputChange}
				className="border"
				placeholder={t('AUTH.email_prompt')}
				value={form.formData.email}
				size={30}
				type="email"
				name="email"
			/>

			<label htmlFor="password" className="text-sm text-slate-500 dark:text-white">
				{t('COMMON.password')} :
			</label>
			<Input
				required
				onChange={form.handleInputChange}
				className="border"
				placeholder={t('AUTH.password_prompt')}
				value={form.formData.password}
				size={30}
				type="password"
				name="password"
			/>

			<label htmlFor="confirm-password" className="text-sm text-slate-500 dark:text-white">
				{t('AUTH.confirm_password_prompt')} :
			</label>
			<Input
				required
				onChange={form.handleInputChange}
				className="border"
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

			{form.errors && form.errors[0] ? <span className="text-xs text-red-500">{form.errors[0]}</span> : null}

			<ThemedButton disabled={form.loading || form.errors?.[0] ? true : false} className="flex gap-2 mt-5">
				{form.loading && (
					<span className="animate-spin">
						<LoaderCircle />
					</span>
				)}
				{t('AUTH.sign_up_title').toUpperCase()}
			</ThemedButton>

			<p className="pt-3 text-sm text-slate-500 dark:text-white">
				{t('AUTH.have_an_account')}{' '}
				{signInLink ? (
					<a className="text-blue-500 cursor-pointer" href={signInLink}>
						{t('AUTH.sign_in_title')}
					</a>
				) : (
					<button
						className="p-0 text-blue-500 bg-transparent border-none cursor-pointer font-inherit"
						type="button"
						onClick={() => setMode('signin')}
					>
						{t('AUTH.sign_in_title')}
					</button>
				)}
			</p>

			<TeamsTimerFooter />
		</form>
	) : (
		<TeamsLoginForm className={className} redirectHandler={redirectHandler} />
	);
};

const TeamsRegistrationDialog = ({ trigger, signInLink }: { trigger?: React.ReactNode; signInLink?: string }) => {
	return (
		<Dialog trigger={trigger ? trigger : <ThemedButton>REGISTER NOW</ThemedButton>}>
			<TeamsRegistrationForm signInLink={signInLink} />
		</Dialog>
	);
};

export { TeamsLoginForm, TeamsUserAvatar, TeamsLoginDialog, TeamsRegistrationForm, TeamsRegistrationDialog };
