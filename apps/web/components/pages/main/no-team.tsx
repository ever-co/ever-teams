import { useTranslation } from 'lib/i18n';
import noTeamImg from '../../../public/assets/svg/no-team.svg';
import { Text, Button, Avatar } from 'lib/components';
import { useModal } from '@app/hooks';
import { CreateTeamModal } from 'lib/features';
import { PropsWithChildren } from 'react';
import { clsxm } from '@app/utils';

type Props = PropsWithChildren & React.ComponentPropsWithRef<'div'>;
const NoTeam = ({ className, ...rest }: Props) => {
	const { trans } = useTranslation();
	const { isOpen, closeModal, openModal } = useModal();

	return (
		<div
			className={clsxm(
				'flex justify-center items-center flex-col xs:mt-32 mt-8 mx-auto',
				className
			)}
			{...rest}
		>
			<Avatar size={70} imageUrl={noTeamImg} className="bg-transparent mb-4" />
			<Text.Heading as="h3" className="text-2xl font-medium mb-4 text-center">
				{trans.common.NO_TEAM}
			</Text.Heading>
			<div className="xs:w-5/12 mx-auto text-center w-full">
				<p className="text-default font-medium opacity-40 dark:text-light--theme-dark">
					{trans.common.NO_TEAM_SUB}
				</p>
			</div>
			<Button
				className="mt-10 font-medium text-base capitalize"
				onClick={openModal}
			>
				{trans.common.CREATE_TEAM}
			</Button>
			<CreateTeamModal open={isOpen} closeModal={closeModal} />
		</div>
	);
};

export default NoTeam;
