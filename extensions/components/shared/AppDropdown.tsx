import classNames from "classnames"
import React, { FC, useRef, useState } from "react"

import useOnClickOutside from "~hooks/useOnClickOutside"
import { textEllipsis } from "~misc/tailwindClasses"

interface IAppDropdownProps {
  buttonClassNames: string
  buttonTitle: string
  options: any[]
  onOptionSelect: (option: any) => void
  optionContainerClassNames?: string
}

export const AppDropdown: FC<IAppDropdownProps> = ({
  buttonClassNames,
  buttonTitle,
  options,
  onOptionSelect,
  optionContainerClassNames = ""
}) => {
  const ref = useRef()
  const [dropdownHidden, setHidden] = useState<boolean>(true)

  useOnClickOutside(ref, () => setHidden(true))

  const selectOption = (name: string) => {
    setHidden(true)
    onOptionSelect(name)
  }

  const optionElements = options.map((name) => {
    return (
      <li key={name} onClick={() => selectOption(name)}>
        <a
          href="#"
          className="block py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
          {name}
        </a>
      </li>
    )
  })

  return (
    <div ref={ref}>
      <button
        id="dropdownDefault"
        data-dropdown-toggle="dropdown"
        className={classNames(
          "inline-flex items-center justify-between",
          buttonClassNames
        )}
        type="button"
        onClick={() => setHidden((prev) => !prev)}>
        <span className={classNames(textEllipsis)}>{buttonTitle}</span>
        {svgCaret}
      </button>
      <div
        id="dropdown"
        className={classNames(
          "scrollbar absolute overflow-auto max-h-64 mt-1.5 z-10 w-44 bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700",
          dropdownHidden && "hidden",
          optionContainerClassNames
        )}>
        <ul
          className="py-1 text-sm text-gray-700 dark:text-gray-200"
          aria-labelledby="dropdownDefault">
          {optionElements}
        </ul>
      </div>
    </div>
  )
}

const svgCaret = (
  <svg
    className="ml-2 w-4 h-4 min-w-[16px]"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 9l-7 7-7-7"></path>
  </svg>
)

export default AppDropdown
