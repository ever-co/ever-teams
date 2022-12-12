import ToggleThemeContainer from "../toggleThemeBtns";

const Footer = () => {
  return (
    <footer className="py-2 flex flex-col md:flex-row items-center text-sm lg:text-base text-center sm:text-start justify-between font-light x-container-fluid">
      <div className="text-light flex flex-col space-x-1 sm:flex-row md:flex-start sm:items-center  text-center md:flex-row">
        <div className="flex items-center justify-between sm:justify-start sm:space-x-2 space-x-1">
          <span className="px-1">@ 2022-Present,</span>
          <a
            href="https://gauzy.team"
            target="_blank"
            className="text-primary dark:text-gray-300"
            rel="noreferrer"
          >
            Gauzy Teams
          </a>
          <div>by</div>
          <a
            href="https://ever.co"
            target="_blank"
            className="text-primary dark:text-gray-300"
            rel="noreferrer"
          >
            Ever Co. LTD.
          </a>{" "}
          <div className="hidden xs:flex space-x-2 sm:hidden">
            <ToggleThemeContainer />
          </div>
        </div>
        <div>All rights reserved.</div>
        <div className="hidden sm:flex space-x-2 md:hidden">
          <ToggleThemeContainer />
        </div>
      </div>

      <div className="flex flex-col xs:flex-row sm:flex-col items-center md:flex-row">
        <div className="flex space-x-4 text-center w-full justify-center">
          <a
            href="https://demo.gauzy.co/#/pages/legal/terms"
            target="_blank"
            className="text-primary dark:text-gray-300"
            rel="noreferrer"
          >
            Terms Of Service
          </a>
          <a
            href="https://demo.gauzy.co/#/pages/legal/privacy"
            target="_blank"
            className="text-primary dark:text-gray-300"
            rel="noreferrer"
          >
            Privacy Policy
          </a>
        </div>
        <div className="space-x-2 px-4 flex xs:hidden md:flex">
          <ToggleThemeContainer />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
