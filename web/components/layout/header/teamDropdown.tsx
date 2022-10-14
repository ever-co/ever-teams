import React from "react";

export default function TeamDropdown(list: string[]) {
  const [isActive, setIsActive] = React.useState<boolean>(false);
  const [selected, setSelected] = React.useState<String>();
  list = ["Team Alpha", "Team Beta"];

  return (
    <div className="relative inline-block w-full">
      <div>
        <button
          type="button"
          className="inline-flex w-full justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
          id="menu-button"
          onClick={() => setIsActive(!isActive)}
        >
          <span>{selected == null ? "Team Names" : selected}</span>
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {isActive && (
        <div className="absolute z-1 top-110 bg-white shadow-lg w-full p-1 cursor-pointer">
          {list.map((item, index) => (
            <div
              key={index}
              onClick={(e) => {
                setSelected(item);
                setIsActive(false);
              }}
              className="p-1 cursor-pointer hover:bg-gray-100 ease-out duration-200"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
