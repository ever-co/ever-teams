import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';
import { TranslationHooks, useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';

export const LoadingSkeleton: React.FC = () => {
	const t = useTranslations();

	return (
		<Card className="bg-white rounded-md border border-gray-100 dark:border-gray-800 dark:bg-dark--theme-light min-h-[600px] w-full">
			<Table>
				<TableHeader>
					<TableRow className="bg-gray-50 dark:bg-gray-800">
						<TableHead className="font-semibold">{t('common.DATE')}</TableHead>
						<TableHead className="font-semibold">{t('common.MEMBER')}</TableHead>
						<TableHead className="font-semibold">{t('common.APPLICATION')}</TableHead>
						<TableHead className="font-semibold">{t('common.TIME_SPENT')}</TableHead>
						<TableHead className="font-semibold">{t('common.PERCENT_USED')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{[...Array(7)].map((_, i) => (
						<TableRow key={i}>
							<TableCell>
								<Skeleton className="w-32 h-4" />
							</TableCell>
							<TableCell>
								<div className="flex gap-2 items-center">
									<Skeleton className="w-8 h-8 rounded-full" />
									<Skeleton className="w-24 h-4" />
								</div>
							</TableCell>
							<TableCell>
								<Skeleton className="w-24 h-4" />
							</TableCell>
							<TableCell>
								<Skeleton className="w-16 h-4" />
							</TableCell>
							<TableCell>
								<Skeleton className="w-full h-4" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Card>
	);
};

interface EmptyStateProps {
	selectedDate?: string;
	t: TranslationHooks;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ selectedDate, t }) => {
	const formattedDate = selectedDate
		? new Date(selectedDate).toLocaleDateString('en-US', {
				weekday: 'long',
				day: '2-digit',
				month: 'long',
				year: 'numeric'
			})
		: '';

	return (
		<Card className="grow w-full min-h-[600px]">
			<AnimatedEmptyState
				showBorder={false}
				title={t('common.NO_ACTIVITY_DATA')}
				message={
					<>
						{selectedDate && <p className="mb-2">for {formattedDate}</p>}
						{t('common.SELECT_DIFFERENT_DATE')}
					</>
				}
			/>
		</Card>
	);
};
