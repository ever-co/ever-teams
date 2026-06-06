import Link from 'next/link';

export const DemoBanner = () => (
	<div className="sticky top-0 z-50 bg-gray-900 dark:bg-gray-100 p-4 text-center text-lg font-semibold text-gray-100 dark:text-gray-900 [&_a:hover]:text-indigo-500 [&_a]:text-fuchsia-500">
		Live Demo of Next.js Boilerplate and{' '}
		<a href="https://ever.team/" className="underline" target="_blank">
			Ever Teams
		</a>{' '}
		- <Link href="/sign-up">Explore the Authentication</Link>
	</div>
);
