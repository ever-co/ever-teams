import { signInFunction } from './social-logins';
import { Divider } from 'lib/components';
import { mappedProviders, providerNames } from '@app/utils/check-provider-env-vars';
import { FaFacebook, FaGoogle, FaGithub, FaTwitter } from 'react-icons/fa';

export default function SocialLogins() {
	const providerIcons = [
		{
			name: 'facebook',
			icon: (
				<div className="h-5 w-5 flex items-center justify-center">
					{/* @ts-ignore */}
					<FaFacebook size={20} aria-hidden="true" />
				</div>
			)
		},
		{
			name: 'google',
			icon: (
				<div className="h-5 w-5 flex items-center justify-center">
					{/* @ts-ignore */}
					<FaGoogle size={20} aria-hidden="true" />
				</div>
			)
		},
		{
			name: 'github',
			icon: (
				<div className="h-5 w-5 flex items-center justify-center">
					{/* @ts-ignore */}
					<FaGithub size={20} aria-hidden="true" />
				</div>
			)
		},
		{
			name: 'twitter',
			icon: (
				<div className="h-5 w-5 flex items-center justify-center">
					{/* @ts-ignore */}
					<FaTwitter size={20} aria-hidden="true" />
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
