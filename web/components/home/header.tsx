import { IHeader } from "../../app/interfaces/hooks";

const Header = ({ style }: IHeader) => {
  return (
    <li>
      <div className="flex justify-between text-primary font-bold dark:text-[#FFFFFF]">
        <div className="w-[60px]  text-center">Status</div>
        <div className="w-[215px]  text-center">Name</div>
        <div></div>
        <div className="w-[334px]  text-center">Task</div>
        <div></div>
        <div className="w-[122px]  text-center">Current time</div>
        <div></div>
        <div className="w-[245px]  text-center">Estimate</div>
        <div></div>
        <div className="w-[184px]  text-center">Total worked today</div>
      </div>
    </li>
  );
};
export default Header;
