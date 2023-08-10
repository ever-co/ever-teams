import ProfileInfo from './profile-info';

type Props = {
	profilePicSrc?: string;
	names?: string;
	profileInfoWrapperClassName?: string;
	time: string;
};

const ProfileInfoWithTime = ({
	profilePicSrc,
	names,
	profileInfoWrapperClassName,
	time,
}: Props) => {
	return (
		<div className="flex justify-between items-center w-full">
			<ProfileInfo
				profilePicSrc={profilePicSrc}
				names={names?.slice(0, 10) + '...'}
				wrapperClassName={profileInfoWrapperClassName}
			/>
			<div className="not-italic font-medium text-[0.75rem] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
				{time}
			</div>
		</div>
	);
};

export default ProfileInfoWithTime;
