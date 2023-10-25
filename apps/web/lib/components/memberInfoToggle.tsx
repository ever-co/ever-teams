import { Switch } from '@headlessui/react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from './typography';

export default function MemberInfo() {
	const [enabled, setEnabled] = useState(true);
	const { t } = useTranslation();
	const handleChange = useCallback(() => {
		setEnabled(!enabled);
	}, [enabled]);

	return (
		<div className=" flex items-center gap-x-[10px]">
			<Switch
				checked={enabled}
				onChange={() => {
					handleChange();
				}}
				className={`${enabled ? 'bg-[#DBD3FA]' : 'bg-[#80808061]'}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
			>
				<span className="sr-only">{t('common.USE_SETTING')}</span>
				<span
					aria-hidden="true"
					className={`${enabled ? 'translate-x-9 bg-[#3826A6]' : 'translate-x-1'}
            pointer-events-none inline-block h-[30px] w-[30px] mt-[2.5px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
				/>
			</Switch>
			<Text className="text-gray-400 dark:text-white">{enabled ? 'Activated' : 'Deactivated'}</Text>
		</div>
	);
}
