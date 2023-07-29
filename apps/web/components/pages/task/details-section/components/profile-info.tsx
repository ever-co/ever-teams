// import { auto } from '@popperjs/core';
import { imgTitle } from '@app/helpers';
import { isURL } from 'class-validator';
import clsx from 'clsx';
import { Avatar } from 'lib/components';
import stc from 'string-to-color';

type Props = {
	profilePicSrc?: string;
	names?: string;
	wrapperClassName?: string;
	profilePicSize?: number;
};

const ProfileInfo = ({
	profilePicSrc,
	names,
	wrapperClassName,
	profilePicSize,
}: Props) => {
	const size = profilePicSize || 24;

	return (
		<div
			className={clsx('flex flex-nowrap whitespace-nowrap', wrapperClassName)}
		>
			<div
				className={clsx(
					`w-[${size}px] h-[${size}px]`,
					'flex justify-center items-center',
					'rounded-full text-xs text-default dark:text-white',
					'shadow-md text-md font-normal'
				)}
				style={{
					backgroundColor: `${stc(names)}80`,
				}}
			>
				{profilePicSrc && isURL(profilePicSrc) ? (
					<Avatar
						size={size}
						className="relative cursor-pointer"
						imageUrl={profilePicSrc}
						alt={names || undefined}
						imageTitle={names ? names[0] : ''}
					/>
				) : (
					imgTitle(names || ' ').charAt(0)
				)}
			</div>

			<div className="flex items-center not-italic font-semibold text-[12px] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white ml-1">
				{names}
			</div>
		</div>
	);
};

export default ProfileInfo;
