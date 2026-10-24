import { SVGProps } from 'react';

/** The Ever ID sign-in button icon: an identity card. Decorative; the button text names the provider. */
export function IconsEverId(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" {...props}>
			<rect x="2.75" y="4.75" width="18.5" height="14.5" rx="3.25" stroke="currentColor" strokeWidth="1.75" />
			<circle cx="8.75" cy="10.75" r="2.25" stroke="currentColor" strokeWidth="1.75" />
			<path
				d="M5.5 16.25c.55-1.55 1.75-2.4 3.25-2.4s2.7.85 3.25 2.4M14.25 10h4.25M14.25 13.5h3"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
			/>
		</svg>
	);
}
