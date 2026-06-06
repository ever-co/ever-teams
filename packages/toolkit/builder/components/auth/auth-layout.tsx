import { cn } from '@ever-teams/toolkit-ui';
import { PropsWithChildren, ReactNode } from 'react';
import { Text } from '../typography';
import { BaseLayout } from '../layouts/base-layout';
import { GradientBackground } from './gradient-background';

interface AuthLayoutProps extends PropsWithChildren {
	title?: string;
	description?: string | ReactNode;
	isAuthPage?: boolean;
}

export function AuthLayout({ children, title, description, isAuthPage = true }: AuthLayoutProps) {
	return (
		<BaseLayout className="flex items-center justify-center">
			<GradientBackground />

			<div className="w-full flex items-center justify-center px-4 min-h-screen relative z-10">
				<div className="w-full max-w-[550px]">
					{isAuthPage && (
						<div className="text-center mb-12">
							{title && (
								<Text.Heading
									as="h1"
									className={cn(
										"text-gray-900 dark:text-white/90 mb-3",
										"bg-clip-text bg-gradient-to-r from-primary to-purple-500"
									)}
								>
									{title}
								</Text.Heading>
							)}
							{description && (
								<p className="text-gray-600 dark:text-white/60 text-lg">
									{description}
								</p>
							)}
						</div>
					)}
					{children}
				</div>
			</div>
		</BaseLayout>
	);
}
