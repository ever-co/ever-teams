import { useAuthenticateUser, useModal } from '@app/hooks';
import { clsxm } from '@app/utils';
import { Avatar, Button, Text, Tooltip } from 'lib/components';
import { CreateTeamModal } from 'lib/features';
import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import noTeamImg from '../../../public/assets/svg/no-team.svg';

type Props = PropsWithChildren & React.ComponentPropsWithRef<'div'>;
const NoTeam = ({ className, ...rest }: Props) => {
	const { t } = useTranslation();
	const { isOpen, closeModal, openModal } = useModal();
	const { user } = useAuthenticateUser();

	return (
		<div className={clsxm('flex justify-center items-center flex-col xs:mt-32 mt-8 mx-auto', className)} {...rest}>
			<Avatar size={70} imageUrl={noTeamImg} className="mb-4 bg-transparent" />
			<Text.Heading as="h3" className="mb-4 text-2xl font-medium text-center">
				{t('common.NO_TEAM')}
			</Text.Heading>
			<div className="w-full mx-auto text-center xs:w-5/12">
				<p className="font-medium text-default opacity-40 dark:text-light--theme-dark">
					{t('common.NO_TEAM_SUB')}
				</p>
			</div>

			<Tooltip placement="auto" label={t('common.NO_TEAM_TOOLTIP')} enabled={!user?.isEmailVerified}>
				<Button
					className="mt-10 text-base font-medium capitalize"
					onClick={openModal}
					disabled={!user?.isEmailVerified}
				>
					{t('common.CREATE_TEAM')}
				</Button>
			</Tooltip>
			<CreateTeamModal open={isOpen} closeModal={closeModal} />
		</div>
	);
};

export default NoTeam;
