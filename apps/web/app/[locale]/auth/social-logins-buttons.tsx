import { FaGoogle, FaFacebook, FaTwitter, FaGithub } from 'react-icons/fa';
import { signInFunction } from './social-logins';
import { Divider } from 'lib/components';
import { mappedProviders, providerNames } from '@app/utils/check-provider-env-vars';

export default function SocialLogins() {
	// For many providers, make sure to add icons in alphabetic order
	const providerIcons: { name: string; icon: React.ReactNode }[] = [
		{ name: 'facebook', icon: <FaFacebook key="facebook-icon" /> },
		{ name: 'google', icon: <FaGoogle key="google-icon" /> },
		{ name: 'github', icon: <FaGithub key="github-icon" /> },
		{ name: 'twitter', icon: <FaTwitter key="twitter-icon" /> }
	].filter((provider) => providerNames[provider.name] !== undefined);

	return (
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
							<span>{providerIcons[i].icon}</span>
						</button>
					</form>
				))}
			</div>
		</div>
	);
}
