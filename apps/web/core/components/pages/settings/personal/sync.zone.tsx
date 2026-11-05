import { dataSyncModeState, isDataSyncState } from '@/core/stores/common/data-sync';
import { Button } from '@/core/components/common/button';
import { DataSyncModeToggler, DataSyncToggler } from '@/core/components/common/toggler';
import { Modal } from '@/core/components/common/modal';
import { Text } from '@/core/components/common/typography';
import { useTranslations } from 'next-intl';
import { useAtomValue, useSetAtom } from 'jotai';
import { SETTINGS_LABEL_CLASS, SETTINGS_ROW_CLASS, SETTINGS_ROWS_CLASS } from '../settings-section';

function dataSyncStateLabel(isDataSync: boolean, t: ReturnType<typeof useTranslations>) {
	if (isDataSync) {
		return t('common.ENABLED');
	}
	return t('common.DISABLED');
}

function dataSyncModeLabel(dataSyncMode: string, t: ReturnType<typeof useTranslations>) {
	if (dataSyncMode == 'REAL_TIME') {
		return t('pages.settingsPersonal.SYNC_MODE_REAL_TIME');
	}
	return t('pages.settingsPersonal.SYNC_MODE_PULL');
}

export function SyncZone() {
	const t = useTranslations();
	const isDataSync = useAtomValue(isDataSyncState);
	const dataSyncMode = useAtomValue(dataSyncModeState);
	return (
		<div className={SETTINGS_ROWS_CLASS}>
			<div className={SETTINGS_ROW_CLASS}>
				<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsPersonal.AUTO_SYNC')}</Text>
				<div className="flex items-center gap-3">
					<DataSyncToggler />
					<Text className="text-sm text-muted-foreground">{dataSyncStateLabel(isDataSync, t)}</Text>
				</div>
			</div>
			{isDataSync && (
				<div className={SETTINGS_ROW_CLASS}>
					<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsPersonal.SYNC_MODE')}</Text>
					<div className="flex items-center gap-3">
						<DataSyncModeToggler />
						<Text className="text-sm text-muted-foreground">{dataSyncModeLabel(dataSyncMode, t)}</Text>
					</div>
				</div>
			)}
		</div>
	);
}

export const RealTimePopup = ({ closeModal, open }: { closeModal: () => void; open: boolean }) => {
	const t = useTranslations();
	const setDataSyncMode = useSetAtom(dataSyncModeState);
	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<div className="flex w-full flex-col gap-6 sm:w-md">
				<p className="pr-6 text-sm text-balance text-foreground">{t('alerts.REAL_TIME_ON_WORKING')}</p>
				<div className="flex justify-end">
					<Button
						onClick={() => {
							setDataSyncMode('PULL');
							closeModal();
						}}
					>
						{t('common.OK')}
					</Button>
				</div>
			</div>
		</Modal>
	);
};
