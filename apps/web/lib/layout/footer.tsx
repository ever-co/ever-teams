import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Text, ThemeToggler } from 'lib/components';
import { useTranslation } from 'lib/i18n';

export function Footer({ className }: IClassName) {
	const { trans } = useTranslation();

	return (
		<footer
			className={clsxm(
				'flex flex-col xs:flex-row justify-around items-center w-full py-6 px-3',
				className
			)}
		>
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em] text-center md:mb-2 mb-7">
				© 2022-Present,{' '}
				<Text.Link href="https://ever.team">{trans.TITLE}</Text.Link> by{' '}
				<Text.Link href="https://ever.co/">Ever Co</Text.Link>.{' '}
				{trans.layout.footer.RIGHTS_RESERVERD}
			</p>

			<div className=''>
				<ThemeToggler />
			</div>
		</footer>
	);
}
