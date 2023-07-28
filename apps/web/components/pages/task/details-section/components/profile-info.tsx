// import { auto } from '@popperjs/core';
import clsx from 'clsx';
import { Avatar } from 'lib/components';

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
	return (
		<div
			className={clsx('flex flex-nowrap whitespace-nowrap', wrapperClassName)}
		>
			<Avatar
				size={profilePicSize || 24}
				className="relative cursor-pointer"
				imageUrl={profilePicSrc}
				alt={names || undefined}
				imageTitle={names ? names[0] : ''}
			/>

			<div className="flex items-center not-italic font-semibold text-[12px] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white ml-1">
				{names}
			</div>
		</div>
	);
};

export default ProfileInfo;
