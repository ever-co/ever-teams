import useAuthenticateUser from "@app/hooks/useAuthenticateUser";
import Image from "next/image";

const Profile = () => {
  const { logOut } = useAuthenticateUser();
  return (
    <div className="flex justify-center items-right cursor-pointer">
      <Image
        onClick={logOut}
        src="/assets/profiles/Profile.png"
        alt="User Icon"
        width={48}
        height={48}
      />
    </div>
  );
};

export default Profile;
