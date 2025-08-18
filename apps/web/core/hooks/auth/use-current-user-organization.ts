import { currentUserOrganizationState } from '@/core/stores/user/user-organizations';
import { useAtom } from 'jotai';

export const useCurrentUserOrganization = () => {
	const [currentUserOrganization, setCurrentUserOrganization] = useAtom(currentUserOrganizationState);
};
