import { UserType } from '../../../types';

export const UserTypeButtons = ({ userTypes, activeTab, onTabChange }: {
    userTypes: UserType[];
    activeTab: number | null;
    onTabChange: (index: number) => void;
  }) => (
    <div className="flex gap-4 max-w-4xl w-full mb-8">
      {userTypes.map((type, index) => (
        <button
          key={index}
          onClick={() => onTabChange(index)}
          className={`
            px-6 py-3 bg-[#080808] rounded-xl border border-[#3D3D3D] 
            hover:bg-white hover:text-black transition-all duration-300
            ${activeTab === index ? 'bg-white text-black' : 'text-white/90'}
            flex-1 text-center
          `}
        >
          <span className="text-xl font-medium block">
            {type.title}
          </span>
        </button>
      ))}
    </div>
  );