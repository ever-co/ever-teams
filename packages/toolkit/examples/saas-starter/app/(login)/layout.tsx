'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/auth';
import { User } from '@/lib/db/schema';
import { BackgroundElements } from '@/components/landing-page';

const Layout: FC = ({ children }: { children?: ReactNode }) => {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);

	const [, setLocalUser] = useState<User | null>(null);
	const { userPromise } = useUser();

	useEffect(() => {
		const loadUser = async () => {
			try {
				if (userPromise) {
					const user = await userPromise;
					setLocalUser(user);
					if (user) {
						router.push('/dashboard');
					}
				}
			} catch (error) {
				setLocalUser(null);
			} finally {
				setIsLoading(false);
			}
		};

		loadUser();
	}, [userPromise, router]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-pulse">Loading ...</div>
			</div>
		);
	}

	return (
		<>
			<BackgroundElements />
			{children}
		</>
	);
};

export default Layout;
