import { AuthenticatedSettingScreen } from '../../../../app/screens';
import { routeOf } from '../../../navigation/current-screen';

function personalTab() {
	return { activeTab: 1 };
}

/** `/settings/personal`: the personal settings. */
export default routeOf(AuthenticatedSettingScreen, personalTab);
