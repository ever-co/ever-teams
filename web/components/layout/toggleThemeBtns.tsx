import { useTheme } from "next-themes";

function ToggleThemeContainer() {
  const { setTheme } = useTheme();

  return (
    <div className="toggleThemeContainer">
      <button className="border-none" onClick={() => setTheme("dark")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 30 30"
          className="dark:bg-[#6a7c90] bg-transparent rounded-2xl"
        >
          <g id="moon" transform="translate(7.576 7.576)">
            <path
              d="M13.642,8.666a1.1,1.1,0,0,0-1-.442,6.077,6.077,0,0,1-.788.031A5.836,5.836,0,0,1,6.117,2.546,5.759,5.759,0,0,1,6.235,1.29,1.069,1.069,0,0,0,5.88.263,1.1,1.1,0,0,0,4.8.061,7.1,7.1,0,0,0,0,6.844a6.994,6.994,0,0,0,2.143,4.944A7.223,7.223,0,0,0,7.19,13.846h.019a7.265,7.265,0,0,0,3.914-1.136,7.142,7.142,0,0,0,2.62-2.959A1.068,1.068,0,0,0,13.642,8.666Zm-6.434,3.89H7.193A5.878,5.878,0,0,1,1.311,6.828,5.8,5.8,0,0,1,4.883,1.415,7,7,0,0,0,6.895,7.437,7.225,7.225,0,0,0,11.82,9.543c.188,0,.377,0,.565-.007A5.938,5.938,0,0,1,7.208,12.556Z"
              transform="translate(0 0)"
            />
          </g>
        </svg>
      </button>
      <button className="border-none" onClick={() => setTheme("light")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 30 30"
          className="bg-[#1b005d] dark:bg-transparent rounded-2xl"
          id="sun-svg"
        >
          <g
            id="sun"
            transform="translate(0)"
            style={{
              fill: "#fff",
            }}
          >
            <g transform="translate(4.662 4.616)">
              <path
                d="M.708,0A.708.708,0,0,0,0,.708V2.721a.708.708,0,1,0,1.416,0V.708A.708.708,0,0,0,.708,0Z"
                transform="translate(9.665 17.319)"
              />
              <path
                d="M.708,3.429a.708.708,0,0,0,.708-.708V.708A.708.708,0,0,0,0,.708V2.721A.708.708,0,0,0,.708,3.429Z"
                transform="translate(9.665 0)"
              />
              <path
                d="M1.632.207.208,1.63a.708.708,0,0,0,1,1L2.633,1.209a.708.708,0,0,0-1-1Z"
                transform="translate(2.831 15.078)"
              />
              <path
                d="M.708,2.839a.706.706,0,0,0,.5-.207L2.632,1.209a.708.708,0,1,0-1-1L.207,1.631a.708.708,0,0,0,.5,1.209Z"
                transform="translate(15.077 2.831)"
              />
              <path
                d="M3.429.708A.708.708,0,0,0,2.721,0H.708a.708.708,0,0,0,0,1.416H2.721A.708.708,0,0,0,3.429.708Z"
                transform="translate(0 9.666)"
              />
              <path
                d="M2.722,0H.708a.708.708,0,0,0,0,1.416H2.722A.708.708,0,1,0,2.722,0Z"
                transform="translate(17.319 9.666)"
              />
              <path
                d="M1.631,2.632a.708.708,0,1,0,1-1L1.209.207a.708.708,0,0,0-1,1Z"
                transform="translate(2.832 2.831)"
              />
              <path
                d="M1.209.207a.708.708,0,0,0-1,1L1.63,2.632a.708.708,0,1,0,1-1Z"
                transform="translate(15.078 15.078)"
              />
              <path
                d="M0,5.511a5.511,5.511,0,1,1,5.511,5.511A5.517,5.517,0,0,1,0,5.511Z"
                transform="translate(4.863 4.863)"
              />
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}

export default ToggleThemeContainer;
