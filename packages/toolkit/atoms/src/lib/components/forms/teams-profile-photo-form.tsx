import { Avatar, cn } from '@ever-teams/toolkit-ui';
import { SpinOverlayLoader } from '@components/loaders/spin-overlay-loader';
import { useProfilePictureForm } from '@hooks/useProfileForm';
import { useTeamsContext } from '@lib/context/teams-context';
import { PencilLine } from 'lucide-react';

const TeamsProfilePhotoForm = ({ className }: { className?: string }) => {
	const { authenticatedUser: user } = useTeamsContext();

	const form = useProfilePictureForm();

	if (!user) return null;

	return (
		<div className={cn('relative w-20 h-20', className)}>
			{form.loading && <SpinOverlayLoader className="bg-black/30 text-white dark:text-black rounded-full z-50" />}
			<div className="size-7 absolute border-[2px] border-white dark:border-black/50 cursor-pointer flex justify-center items-center top-1 right-[-5px] z-20 text-white bg-blue-950 rounded-full">
				<PencilLine className="size-3 cursor-pointer" />
				<input
					type="file"
					onChange={(e) => {
						form.handleInputChange(e);
						form.handleSubmitFile(e);
					}}
					accept="image/*"
					multiple={false}
					className="absolute top-0 left-0 size-7 opacity-0 cursor-pointer"
					title="Change Profile Picture"
				/>
			</div>
			<Avatar
				fallback={user.firstName[0] + user.lastName[0]}
				src={form.preview ? form.preview : user.imageUrl}
				title={user.firstName + ' ' + user.lastName}
				className="w-20 h-20"
			/>
		</div>
	);
};

export { TeamsProfilePhotoForm };
