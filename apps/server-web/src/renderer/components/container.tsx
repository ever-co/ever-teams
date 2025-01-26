import {
  Children
} from 'react';

type Props = {
  children: JSX.Element[]
}
const Container = ({ children }:Props) => {
  return (
    <div
      className="min-h-full flex flex-row flex-auto flex-shrink-0 antialiased text-gray-800 rounded-lg bg-[#F2F2F2] dark:bg-[#1e2025] shadow-md shadow-md"
    >
      {Children.map(children, child =>
        <>{child}</>
      )}

    </div>
  )
}

export default Container;

