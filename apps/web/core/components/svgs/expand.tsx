import { FC, SVGProps } from 'react';

export function ExpandIcon({ width, height, fill = '#8C7AE4' }: { width: number; height: number; fill?: string }) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={width ?? '1em'} height={height ?? '1em'} viewBox="0 0 24 24">
			<path fill={fill ?? 'currentColor'} d="M5 19v-6h2v4h4v2zm12-8V7h-4V5h6v6z"></path>
		</svg>
	);
}

export const CollapseUpIcon: FC<SVGProps<SVGSVGElement>> = ({ width, height, fill = '#8C7AE4', ...props }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width ?? '1em'}
			height={height ?? '1em'}
			viewBox="0 0 24 24"
			{...props}
		>
			<g fill="none">
				<g clipPath="url(#gravityUiChevronsCollapseUpRight0)">
					<path
						fill={fill ?? 'currentColor'}
						fillRule="evenodd"
						d="M15.25 6.993a.75.75 0 0 0 0-1.5H10.5V.75a.75.75 0 1 0-1.5 0v5.493c0 .414.336.75.75.75zM.75 9.007a.75.75 0 1 0 0 1.5H5.5v4.743a.75.75 0 0 0 1.5 0V9.757a.75.75 0 0 0-.75-.75z"
						clipRule="evenodd"
					></path>
				</g>
				<defs>
					<clipPath id="gravityUiChevronsCollapseUpRight0">
						<path fill={fill ?? 'currentColor'} d="M0 0h16v16H0z"></path>
					</clipPath>
				</defs>
			</g>
		</svg>
	);
};
