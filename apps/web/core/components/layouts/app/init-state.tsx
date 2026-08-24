import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { FastInitState } from './fast-init-state';
import { LegacyInitState } from './legacy-init-state';

export function AppState() {
	const { data: user } = useUserQuery();

	// const { currentLanguage } = useLanguage();
	// useSyncLanguage(currentLanguage);
	return <>{user && <InitState />}</>;
}

function InitState() {
	return FAST_APP_BOOTSTRAP.value ? <FastInitState /> : <LegacyInitState />;
}
