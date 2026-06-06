import {
  Children,
  JSX
} from 'react';

type Props = {
  children: JSX.Element[] | JSX.Element
}
const Container = ({ children }:Props) => {
  return (
    <div
      className="min-h-full flex flex-row flex-auto shrink-0 antialiased text-gray-800 rounded-lg bg-[#F2F2F2] dark:bg-[#1e2025] shadow-md shadow-md mt-[28px]"
    >
      {Children.map(children, child =>
        <>{child}</>
      )}

    </div>
  )
}

export default Container;
