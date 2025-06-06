import { APP_LINK, APP_LOGO_URL } from '@/core/constants/config/constants';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

type Props = IClassName<{
	dash?: boolean;
	color?: 'auto' | 'default' | 'white' | 'white-black' | 'black-white' | 'dark';
}>;

export function EverTeamsLogo({ className, dash, color = 'auto' }: Props) {
	return (
		<Link href={dash ? '/' : APP_LINK!} target="_self" className="text-[#3E1DAD] dark:text-white">
			{APP_LOGO_URL ? (
				<Image
					src={APP_LOGO_URL}
					id="ever-teams-logo"
					className={clsxm(
						'cursor-pointer w-[128.104px] h-[25px] object-contain',
						color === 'auto' && ['dark:brightness-0 dark:invert fill-[#3E1DAD] dark:fill-white'],
						color === 'white' && ['brightness-0 invert'],
						color === 'dark' && ['brightness-0 invert-0'],
						color === 'white-black' && ['brightness-0 invert dark:invert-0 fill-white dark:fill-black'],
						color === 'black-white' && ['brightness-0 invert-0 dark:invert'],
						className
					)}
					alt="EverTeams Logo"
					width={350}
					height={350}
				/>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="128.104"
					height="25"
					viewBox="0 0 128.104 25"
					id="ever-teams-logo"
					className={clsxm(
						'cursor-pointer',
						color === 'auto' && ['dark:brightness-0 dark:invert !fill-[#3E1DAD] dark:fill-white'],
						color === 'white' && ['brightness-0 invert'],
						color === 'dark' && ['brightness-0 invert-0'],
						color === 'white-black' && ['brightness-0 invert dark:invert-0 fill-white dark:fill-black'],
						color === 'black-white' && ['brightness-0 invert-0 dark:invert'],
						className
					)}
				>
					<defs>
						<style type="text/css">
							{`@import url('https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@1,300');`}
						</style>
					</defs>
					<g className="g-gauzy-logo-default" transform="translate(-218.189 -3662.039)">
						<g className="g-logo-ever" data-name="logo ever" transform="translate(218.189 3666.449)">
							<path
								className="g-combined-shape"
								d="M473.886,3715.556a3.522,3.522,0,1,1-3.492,3.551v-.03a3.507,3.507,0,0,1,3.492-3.522Zm0,.469a3.052,3.052,0,1,0,3.027,3.078v-.026a3.039,3.039,0,0,0-3.026-3.052Zm-.951,1.058h1.121a1.242,1.242,0,0,1,.892.3.937.937,0,0,1,.257.812,1.071,1.071,0,0,1-.254.621,1.394,1.394,0,0,1-.6.405l.578,1.586v.033h-.513l-.521-1.521h-.86l-.261,1.52h-.484Zm.412.407-.246,1.423h.706a.98.98,0,0,0,.621-.2.77.77,0,0,0,.3-.528.611.611,0,0,0-.128-.506.682.682,0,0,0-.505-.188Z"
								transform="translate(-407.046 -3706.524)"
							/>
							<path
								className="g-ever-copy-4"
								d="M229.96,3689.783l1.4,3.766a11.753,11.753,0,0,1-6.364,1.769c-4.567,0-6.809-2.853-6.809-6.647a8.767,8.767,0,0,1,8.884-9.073c3.756,0,5.718,2.168,5.718,5.135a10.129,10.129,0,0,1-.9,3.908h-8.716c-.028,1.4.925,2.453,2.83,2.453A8.256,8.256,0,0,0,229.96,3689.783Zm-1.457-4.108a2.469,2.469,0,0,0,.14-.742c0-.827-.645-1.427-1.822-1.427a3.142,3.142,0,0,0-3.055,2.168Zm7.651,2.91.5-3c.14-.713.112-1.256-.5-1.256a3.431,3.431,0,0,0-1.374.31l.589-4.333a9.393,9.393,0,0,1,3.475-.571c2.411,0,3.9,1.169,3.307,4.507l-.616,3.481c-.252,1.63.112,2.483,1.205,2.483,1.6,0,2.607-1.255,2.607-4.907a22.218,22.218,0,0,0-.729-5.308H250.2a31.314,31.314,0,0,1,.421,4.793c0,6.674-3.027,10.413-8.6,10.413C237.275,3695.2,235.454,3692.665,236.154,3688.585Zm28.444,1.2,1.4,3.766a11.754,11.754,0,0,1-6.364,1.769c-4.569,0-6.811-2.853-6.811-6.647a8.772,8.772,0,0,1,8.889-9.073c3.756,0,5.718,2.168,5.718,5.135a10.131,10.131,0,0,1-.893,3.908H257.82c-.028,1.4.925,2.453,2.83,2.453A8.264,8.264,0,0,0,264.6,3689.783Zm-1.454-4.108a2.476,2.476,0,0,0,.14-.742c0-.827-.645-1.427-1.822-1.427a3.142,3.142,0,0,0-3.055,2.168Zm6.95,9.244,1.6-9.329c.112-.713.112-1.256-.5-1.256a4.459,4.459,0,0,0-1.4.31l.617-4.333a10.575,10.575,0,0,1,3.5-.571c1.682,0,2.915.628,3.279,2.14a4.248,4.248,0,0,1,3.725-2.14,5.108,5.108,0,0,1,2.469.6l-1.485,5.021a6.157,6.157,0,0,0-2.663-.6,2.693,2.693,0,0,0-2.55,2.368l-1.345,7.789Z"
								transform="translate(-218.189 -3679.598)"
							/>
						</g>
						<text
							className="text-current g-gauzy-text"
							transform="translate(292.794 3681.039)"
							fontFamily="Fira Sans, sans-serif"
							fontSize="21"
							fontWeight="300"
							fontStyle="italic"
							letterSpacing="-0.035em"
						>
							<tspan x="0" y="0">
								teams
							</tspan>
						</text>
					</g>
				</svg>
			)}
		</Link>
	);
}
