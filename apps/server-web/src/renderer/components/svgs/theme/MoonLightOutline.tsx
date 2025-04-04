import React from 'react';

interface MoonLightOutlineProps {
	className?: string;
}

const MoonLightOutline: React.FC<MoonLightOutlineProps> = ({ className }) => (
	<svg
		className={className}
		width="18"
		height="18"
		viewBox="0 0 18 18"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		stroke="currentColor"
	>
		<path
			d="M1.52232 9.31521C1.79232 13.1777 5.06982 16.3202 8.99232 16.4927C11.7598 16.6127 14.2348 15.3227 15.7198 13.2902C16.3348 12.4577 16.0048 11.9027 14.9773 12.0902C14.4748 12.1802 13.9573 12.2177 13.4173 12.1952C9.74982 12.0452 6.74982 8.97772 6.73482 5.35522C6.72732 4.38022 6.92982 3.45772 7.29732 2.61772C7.70232 1.68771 7.21482 1.24522 6.27732 1.64272C3.30732 2.89522 1.27482 5.88771 1.52232 9.31521Z"
			strokeWidth="1"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>

);

export default MoonLightOutline;
