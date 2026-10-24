import { dataSyncModeState, isDataSyncState } from '@/core/stores/common/data-sync';
import { Button } from '@/core/components/common/button';
import { DataSyncModeToggler, DataSyncToggler } from '@/core/components/common/toggler';
import { Modal } from '@/core/components/common/modal';
import { Text } from '@/core/components/common/typography';
import { useTranslations } from 'next-intl';
import { useAtomValue, useSetAtom } from 'jotai';
import { EverCard } from '@/core/components/common/ever-card';

/** Settings row: label column, control column (see settings-design-contract). */
const ROW = 'grid w-full grid-cols-1 gap-2 border-t border-border py-3 first:border-t-0 first:pt-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4';

export function SyncZone() {
	const t = useTranslations();
	const isDataSync = useAtomValue(isDataSyncState);
	const dataSyncMode = useAtomValue(dataSyncModeState);
	return (
		<div className="w-full">
			<div className={ROW}>
				<Text className="text-sm font-medium text-muted-foreground">Auto Sync</Text>
				<div className="flex items-center gap-3">
					<DataSyncToggler />
					<Text className="text-sm text-muted-foreground">
						{isDataSync ? t('common.ENABLED') : t('common.DISABLED')}
					</Text>
				</div>
			</div>
			{isDataSync ? (
				<div className={ROW}>
					<Text className="text-sm font-medium text-muted-foreground">Sync Mode</Text>
					<div className="flex items-center gap-3">
						<DataSyncModeToggler />
						<Text className="text-sm text-muted-foreground">
							{dataSyncMode == 'REAL_TIME' ? 'Real Time' : 'Pull'}
						</Text>
					</div>
				</div>
			) : null}
		</div>
	);
}

export const RealTimePopup = ({ closeModal, open }: { closeModal: () => void; open: boolean }) => {
	const t = useTranslations();
	const setDataSyncMode = useSetAtom(dataSyncModeState);
	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<div className="sm:w-[530px] w-[330px]">
				<EverCard className="w-full" shadow="custom">
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
				</EverCard>
			</div>
		</Modal>
	);
};
