import { Container, Divider } from 'lib/components';
import { PropsWithChildren } from 'react';

export function MainHeader({ children }: PropsWithChildren) {
	return (
		<>
			<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
				<Container>{children}</Container>
			</div>
			<Divider />
		</>
	);
}
