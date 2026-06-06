import { UserType } from "../../../types";

export const UserTypeContent = ({ userTypes, activeTab }: { userTypes: UserType[]; activeTab: number | null }) => (
    <div className="w-full max-w-4xl">
      {activeTab !== null && (
        <div className="bg-[#080808] p-6 rounded-3xl border border-[#3D3D3D]">
          <p className="text-white/70 text-lg">
            {userTypes[activeTab].explanation}
          </p>
        </div>
      )}
    </div>
  );