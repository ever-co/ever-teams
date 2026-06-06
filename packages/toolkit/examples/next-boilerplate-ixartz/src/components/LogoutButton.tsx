'use client';

import { useClerk } from '@clerk/nextjs';

const LogoutButton = ({ label }: { label: string }) => {
	const { signOut } = useClerk();

	return (
		<button
			onClick={() => {
				if (typeof window !== 'undefined') {
					localStorage.removeItem('auth-token');
				}
				signOut({ redirectUrl: '/' });
			}}
			className="border-none "
			type="button"
		>
			{label}
		</button>
	);
};

export default LogoutButton;
