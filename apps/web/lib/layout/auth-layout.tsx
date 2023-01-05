import { Container, Text } from 'lib/components';
import { PropsWithChildren } from 'react';
import { Footer } from './footer';

type Props = { title?: string; description?: string } & PropsWithChildren;

export function AuthLayout({ children, title, description }: Props) {
	return (
		<Container>
			<div className="flex flex-col items-center h-screen min-h-[500px] justify-between w-full">
				<div className="w-11/12 md:w-1/2 mt-20 lg:mt-28 flex flex-col items-center">
					{title && <Text.H1 className="mb-3 text-center">{title}</Text.H1>}

					{description && (
						<Text className="text-sm md:text-lg text-gray-400 text-center mb-[56px]">
							{description}
						</Text>
					)}

					{children}
				</div>
				<Footer />
			</div>
		</Container>
	);
}
