import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useJitsu } from '@jitsu/jitsu-react';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { Users } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { JitsuAnalytics } from '../analytics/jitsu-analytics';
import { CollaborateDialog } from './collaborate-dialog';

/** The Collaborate pill of the top bar and its dialog. */
const Collaborate = () => {
	const t = useTranslations();
	const { analytics } = useJitsu();
	const { data: user } = useUserQuery();
	const [isOpen, setIsOpen] = useState(false);

	const open = useCallback(() => {
		analytics.track('click-collaborate', {
			context: {
				email: user?.email,
				name: user?.name,
				tenant: user?.tenant?.name,
				tenantId: user?.tenant?.id
			}
		});
		setIsOpen(true);
	}, [analytics, user]);

	const close = useCallback(() => setIsOpen(false), []);

	return (
		<div>
			<JitsuAnalytics user={user} />
			<button
				type="button"
				onClick={open}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'gap-1.5')}
			>
				<Users aria-hidden="true" className="size-3.5 text-muted-foreground" />
				{t('common.COLLABORATE')}
			</button>
			<CollaborateDialog open={isOpen} onClose={close} />
		</div>
	);
};

export default Collaborate;
