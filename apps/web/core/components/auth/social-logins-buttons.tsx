import { Divider } from '@/core/components';
import { mappedProviders, providerNames } from '@/core/lib/utils/check-provider-env-vars';
import { IconsBrandGoogleSolid, IconsFacebook, IconsGithubFilled, IconsTwitterFilled } from '@/core/components/icons';
import { signInFunction } from '../../lib/helpers/social-logins';

export default function SocialLogins() {
	const providerIcons = [
		{
			name: 'facebook',
			icon: (
				<div className="flex items-center justify-center w-5 h-5">
					<IconsFacebook aria-hidden="true" className="size-12" />
				</div>
			)
		},
		{
			name: 'google',
			icon: (
				<div className="flex items-center justify-center w-5 h-5">
					<IconsBrandGoogleSolid aria-hidden="true" className="size-12" />
				</div>
			)
		},
		{
			name: 'github',
			icon: (
				<div className="flex items-center justify-center w-5 h-5">
					<IconsGithubFilled aria-hidden="true" className="size-12" />
				</div>
			)
		},
		{
			name: 'twitter',
			icon: (
				<div className="flex items-center justify-center w-5 h-5">
					<IconsTwitterFilled aria-hidden="true" className="size-12" />
				</div>
			)
		}
	].filter((provider) => providerNames[provider.name] !== undefined);

	return mappedProviders.length > 0 ? (
		<div className="flex flex-col gap-4">
			<div className="flex flex-row items-center justify-center gap-2">
				<Divider className="w-56" />
				<div className="text-sm text-center min-w-max ">Continue with</div>
				<Divider className="w-56" />
			</div>
			<div className="flex items-center justify-center gap-2">
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
							className="flex items-center justify-center w-10 h-10 p-2 border rounded-full"
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
