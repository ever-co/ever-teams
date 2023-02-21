import clsx from 'clsx';
import Image from 'next/image';

type Props = {
	profilePicSrc?: string;
	names?: string;
	wrapperClassName?: string;
};

const ProfileInfo = ({
	profilePicSrc,
	names,
	wrapperClassName,
}: Props) => {
	return (
		<div
			className={clsx('flex flex-nowrap whitespace-nowrap', wrapperClassName)}
		>
			<Image
				alt="profile"
				src={profilePicSrc || ''}
				width={20}
				height={20}
				className="rounded-full mr-1"
			/>
			<div className="flex items-center not-italic font-semibold text-[12px] leading-[140%] tracking-[-0.02em] text-[#282048]">
				{names}
			</div>
		</div>
	);
};

export default ProfileInfo;
