import { AuthenticatedTaskScreen } from '../../../../app/screens';
import { taskParamsOf, routeOf } from '../../../navigation/current-screen';

/** `/task/[id]`: a task. */
export default routeOf(AuthenticatedTaskScreen, taskParamsOf);
