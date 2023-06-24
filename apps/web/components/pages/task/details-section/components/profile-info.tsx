// import { auto } from '@popperjs/core';
import clsx from 'clsx';
import Image from 'next/image';

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
			<div
				className="rounded-full overflow-hidden mr-1"
				style={{
					position: 'relative',
					width: profilePicSize || 24,
					height: profilePicSize || 24,
				}}
			>
				<Image
					alt="profile"
					src={profilePicSrc || ''}
					width={profilePicSize || 24}
					height={profilePicSize || 24}
					style={{ objectFit: 'cover', width: '100%', height: '100%' }}
					className="rounded-full"
				/>
			</div>
			<div className="flex items-center not-italic font-semibold text-[12px] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
				{names}
			</div>
		</div>
	);
};

export default ProfileInfo;
