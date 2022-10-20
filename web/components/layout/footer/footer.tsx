import ToggleThemeContainer from "../toggleThemeBtns";

const Footer = () => {
  return (
    <footer className="py-8 h-16 flex items-center justify-center mx-auto font-light">
      <div className="font-light text-primary dark:text-gray-400">
        © 2022- demo.gauzy.co, Gauzy Team by Ever.Co Ltd. All right reserved
      </div>
      <div className="flex space-x-2 px-4">
        <ToggleThemeContainer />
      </div>
    </footer>
  );
};

export default Footer;
