import { useTheme } from '../ThemeContext';
import clsxm from 'clsx';
import React, { PropsWithChildren } from 'react';
import { IClassName } from '../libs/interfaces';
import {
  MoonLightFillIcon as MoonDarkIcon,
  MoonLightOutline as MoonIcon,
  SunFillIcon as SunIcon,
  SunOutline as SunDarkIcon
} from './svgs';

type Props = {
  className?: string;
  onClickOne?: () => void;
  onClickTwo?: () => void;
  themeTogger?: boolean;
  firstBtnClassName?: string;
  secondBtnClassName?: string;
} & PropsWithChildren;

export function Toggler({
  children,
  className,
  onClickOne,
  onClickTwo,
  firstBtnClassName,
  secondBtnClassName
}: Props) {
  const childrenArr = React.Children.toArray(children);

  return (
    <div
      className={clsxm(
        'flex flex-row items-start bg-light--theme-dark dark:bg-[#1D222A] py-1 px-2 rounded-[60px] gap-[10px]',
        className
      )}
    >
      <button
        onClick={onClickOne}
        className={clsxm(
          'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] ml-[-2px]',
          'bg-white shadow-md dark:bg-transparent dark:shadow-none',
          firstBtnClassName
        )}
      >
        {childrenArr[0] || <></>}
      </button>

      <button
        onClick={onClickTwo}
        className={clsxm(
          'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] mr-[-2px]',
          'dark:bg-[#3B4454]',
          secondBtnClassName
        )}
      >
        {childrenArr[1] || <></>}
      </button>
    </div>
  );
}

export function ThemeToggler({ className }: IClassName) {
  const { toggleTheme } = useTheme();

  return (
    <Toggler
      className={className}
      onClickOne={() => toggleTheme('light')}
      onClickTwo={() => toggleTheme('dark')}
    >
      <>
        <SunDarkIcon className="hidden dark:inline-block h-[18px] w-[18px] dark:text-white" />
        <SunIcon className="dark:hidden inline-block h-[18px] w-[18px] text-[#382686]" />
      </>
      <>
        <MoonDarkIcon className="h-[18px] w-[18px] hidden text-white dark:inline-block " />
        <MoonIcon className="dark:hidden inline-block h-[18px] w-[18px]" />
      </>
    </Toggler>
  );
}
