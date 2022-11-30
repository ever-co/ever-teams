// import { IHeader } from "../../app/interfaces/hooks";

const Header = () => {
  return (
    <li>
      <div className="flex items-center justify-between text-primary font-bold dark:text-[#FFFFFF]">
        <div className="w-[60px]  text-center">Status</div>
        <div className="w-[215px]  text-center">Name</div>
        <div></div>
        <div className="w-[334px]  text-center">Task</div>
        <div></div>
        <div className="w-[122px]  text-center">Worked on task</div>
        <div></div>
        <div className="w-[245px]  text-center">Estimate</div>
        <div></div>
        <div className="w-[184px]  text-center flex items-center justify-center">
          <span className="w-[104px]">Total worked 24 hours</span>
        </div>
      </div>
    </li>
  );
};
export default Header;
