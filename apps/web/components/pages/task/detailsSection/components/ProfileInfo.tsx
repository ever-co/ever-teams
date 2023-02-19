import Image from 'next/image';
import { Fragment } from 'react';

type Props = {
	profilePicSrc?: string;
	names: string;
};

const ProfileInfo: React.FC<Props> = ({ profilePicSrc, names }) => {
	return (
		<Fragment>
			<Image
				alt="profile"
				src={profilePicSrc || ''}
				width={20}
				height={20}
				className="rounded-full"
			/>
			<div className="not-italic font-semibold text-[10px] leading-[140%] tracking-[-0.02em] text-[#282048]">
				{names}
			</div>
		</Fragment>
	);
};

export default ProfileInfo;
