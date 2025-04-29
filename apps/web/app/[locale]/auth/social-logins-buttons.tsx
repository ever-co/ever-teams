import { signInFunction } from './social-logins';
import { Divider } from '@/core/components';
import { mappedProviders, providerNames } from '@app/utils/check-provider-env-vars';
import { IconsBrandGoogleSolid, IconsFacebook, IconsGithubFilled, IconsTwitterFilled } from '@/icons';

export default function SocialLogins() {
	const providerIcons = [
		{
			name: 'facebook',
			icon: (
				<div className="h-5 w-5 flex items-center justify-center">
					<IconsFacebook aria-hidden="true" className="size-12" />
				</div>
			)
		},
		{
			name: 'google',
			icon: (
				<div className="h-5 w-5 flex items-center justify-center">
					<IconsBrandGoogleSolid aria-hidden="true" className="size-12" />
				</div>
			)
		},
		{
			name: 'github',
			icon: (
				<div className="h-5 w-5 flex items-center justify-center">
					<IconsGithubFilled aria-hidden="true" className="size-12" />
				</div>
			)
		},
		{
			name: 'twitter',
			icon: (
				<div className="h-5 w-5 flex items-center justify-center">
					<IconsTwitterFilled aria-hidden="true" className="size-12" />
				</div>
			)
		}
	].filter((provider) => providerNames[provider.name] !== undefined);

	return mappedProviders.length > 0 ? (
		<div className="flex flex-col gap-4">
			<div className="flex flex-row justify-center items-center gap-2">
				<Divider className="w-56" />
				<div className="min-w-max text-sm text-center ">Continue with</div>
				<Divider className="w-56" />
			</div>
			<div className="flex justify-center items-center gap-2">
				{Object.values(mappedProviders).map((provider, i) => (
					<form
						key={provider.id}
						onSubmit={(e) => {
							e.preventDefault();
							signInFunction(provider);
						}}
					>
						<button
							type="submit"
							className="rounded-full w-10 h-10 border p-2 flex justify-center items-center"
						>
							{providerIcons[i].icon}
						</button>
					</form>
				))}
			</div>
		</div>
	) : (
		<></>
	);
}
