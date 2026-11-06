import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { clsxm } from '@/core/lib/utils';

interface IJoinTeamButton {
	value: string;
}

const JoinTeamButton = ({ value }: IJoinTeamButton) => {
	return (
		<button type={undefined} className={clsxm(buttonVariants({ variant: 'outline', size: 'lg' }), 'mt-1 w-full')}>
			{value}
		</button>
	);
};
export default JoinTeamButton;
