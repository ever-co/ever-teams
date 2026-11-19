import { AuthenticatedSettingScreen } from '../../../../../app/screens';
import { routeOf } from '../../../../navigation/current-screen';

function teamTab() {
	return { activeTab: 2 };
}

/** `/settings/team`: the team's settings. */
export default routeOf(AuthenticatedSettingScreen, teamTab);
