import { AuthenticatedProfileScreen } from '../../../../../app/screens';
import { profileParamsOf, routeOf } from '../../../../navigation/current-screen';

/** `/profile/[memberId]`: a member's tasks, the person's own under the Tasks tab. */
export default routeOf(AuthenticatedProfileScreen, profileParamsOf);
