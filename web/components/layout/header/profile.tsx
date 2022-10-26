import Image from "next/image";

const Profile = () => {
  return (
    <div className="flex justify-center items-right cursor-pointer">
      <Image
        src="/assets/profiles/Profile.png"
        alt="User Icon"
        width={48}
        height={48}
      />
    </div>
  );
};

export default Profile;
