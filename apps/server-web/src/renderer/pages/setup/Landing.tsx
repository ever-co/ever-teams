import { EverTeamsLogo } from '../../components/svgs/index';
type props = {
  nextAction: () => void;
};
const Landing = (props: props) => {
  return (
    <div className="w-full">
      <div className="mb-6 ml-10">
        <select className="dark:bg-gray-800 text-gray-700 dark:text-white py-2 px-4 rounded-lg border-2 dark:border-none">
          <option>English</option>
          {/* Add other language options here */}
        </select>
      </div>

      <div className="mb-8 w-full text-center">
        <div className="text-center m-auto mt-8 mb-8 w-48 items-center">
          <EverTeamsLogo />
        </div>
        <h1 className="text-2xl font-bold mb-4 dark:text-gray-400 text-gray-700">
          Welcome to Ever® Teams - Open-Source Business Management Platform
          (ERP/CRM/HRM)
        </h1>
        <p className="dark:text-gray-400 text-gray-500">
          Ever Teams Desktop App provides the full functionality of the Gauzy
          Platform available directly on your desktop computer or a laptop. In
          addition, it allows tracking work time, activity recording, and the
          ability to receive tracking reminders/notifications.
        </p>
      </div>

      {/* Button */}
      <div className="w-full text-center mt-14">
        <button
          onClick={() => {
            props.nextAction();
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-8 rounded-full m-auto"
        >
          Let's go
        </button>
      </div>
    </div>
  );
};

export default Landing;
