import { dataSyncModeState, isDataSyncState } from '@app/stores/data-sync';
import { Button, Card, DataSyncModeToggler, DataSyncToggler, Modal, Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import { useRecoilValue, useSetRecoilState } from 'recoil';

export function SyncZone() {
	const t = useTranslations();
	const isDataSync = useRecoilValue(isDataSyncState);
	const dataSyncMode = useRecoilValue(dataSyncModeState);
	return (
		<div className="flex flex-col items-center justify-between">
			<div className="w-full mt-5">
				<div className="flex flex-col lg:flex-row items-center justify-between w-full gap-6">
					<div className=" flex flex-col items-center justify-between w-full md:w-1/2 sm:gap-4 sm:flex-row">
						<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">Auto Sync</Text>
						<div className="flex items-center w-full">
							<DataSyncToggler />
							<Text className="flex items-center ml-5 text-sm font-normal text-gray-400">
								{isDataSync ? t('common.ENABLED') : t('common.DISABLED')}
							</Text>
						</div>
					</div>
					{isDataSync ? (
						<div className=" flex flex-col items-center justify-between w-full md:w-1/2 sm:gap-4 sm:flex-row">
							<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
								Sync Mode
							</Text>
							<div className="flex items-center w-full">
								<DataSyncModeToggler />
								<Text className="flex items-center ml-5 text-sm font-normal text-gray-400">
									{dataSyncMode == 'REAL_TIME' ? 'Real Time' : 'Pull'}
								</Text>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

export const RealTimePopup = ({ closeModal, open }: { closeModal: () => void; open: boolean }) => {
	const t = useTranslations();
	const setDataSyncMode = useSetRecoilState(dataSyncModeState);
	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<div className="sm:w-[530px] w-[330px]">
				<Card className="w-full" shadow="custom">
					<div>
						<p className="py-4 text-center">{t('alerts.REAL_TIME_ON_WORKING')}</p>
						<div className="flex justify-center gap-2">
							<Button
								onClick={() => {
									setDataSyncMode('PULL');
									closeModal();
								}}
							>
								OK
							</Button>
						</div>
					</div>
				</Card>
			</div>
		</Modal>
	);
};
