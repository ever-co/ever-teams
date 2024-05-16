import { FaGoogle, FaFacebook, FaTwitter, FaGithub } from 'react-icons/fa';
import { mappedProviders } from '../../../auth';
import { signInFunction } from './social-logins';
import { Divider } from 'lib/components';

export default function SocialLogins() {
	const providerIcons: React.ReactNode[] = [
		<FaFacebook key="facebook-icon" />,
		<FaGoogle key="google-icon" />,
		<FaGithub key="github-icon" />,
		<FaTwitter key="twitter-icon" />
	];
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
							<span>{providerIcons[i]}</span>
						</button>
					</form>
				))}
			</div>
		</div>
	);
}
