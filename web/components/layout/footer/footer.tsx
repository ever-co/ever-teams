import ToggleThemeContainer from "../toggleThemeBtns";

const Footer = () => {
  return (
    <footer className="py-8 h-16 flex items-center justify-between container mx-auto font-light">
      <div className="text-light">
        @ 2019-Present,{" "}
        <a
          href="https://gauzy.co"
          target="_blank"
          className="text-primary dark:text-gray-300"
          rel="noreferrer"
        >
          Gauzy
        </a>{" "}
        by{" "}
        <a
          href="https://ever.co"
          target="_blank"
          className="text-primary dark:text-gray-300"
          rel="noreferrer"
        >
          Ever Co. LTD.
        </a>{" "}
        All rights reserved.
      </div>
      <div className="flex items-center">
        <div className="flex space-x-4 ">
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
        <div className="flex space-x-2 px-4">
          <ToggleThemeContainer />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
