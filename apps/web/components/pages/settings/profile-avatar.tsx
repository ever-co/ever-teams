/* eslint-disable no-mixed-spaces-and-tabs */
import { Avatar, Button, InputField } from 'lib/components';
import { withAuthentication } from 'lib/app/authenticator';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useAuthenticateUser, useSettings } from '@app/hooks';
import { useForm } from 'react-hook-form';

const ProfileAvatar = (state: boolean) => {
    const { user } = useAuthenticateUser();
    const { register, setValue, handleSubmit } = useForm();
    const [avatarBtn, setAvatarBtn] = useState(false);
    const { updateAvatar } =
		useSettings();

    const changeAvatarState = () => {
        if (avatarBtn) {
            setAvatarBtn(false);   
        } else {
            setAvatarBtn(true);
        }
	};
    const onSubmit = useCallback(async () => {
        // if (task) {
            await updateAvatar({
                ...task,
                status: 'Closed',
            });
        // }
        // if (activeTeamTask?.id === task?.id) {
            // setActiveTask(null);
        // }
    }, [updateAvatar]);

    // useEffect(() => {
    //     setAvatarBtn(true);
    // }, [])
    return (
        <>
            {/* <form
                className="w-[98%] md:w-[530px]"
                onSubmit={handleSubmit(onSubmit)}
                autoComplete="off"
            > */}
                <div className="flex flex-col justify-between items-center">
                    <div className="w-full">
                        <div className="">
                            <div className='flex w-full items-center justify-between gap-8'>
                                <div className="relative">
                                    <Avatar
                                        size={80}
                                        className="relative cursor-pointer mt-[32px]"
                                        imageUrl={user?.imageUrl}
                                        alt="user avatar"
                                    />
                                    <span className='absolute top-[30px] right-[-4px] bg-[#282048] w-[27px] h-[27px] rounded-full flex justify-center items-center border-[3px] border-white cursor-pointer' onClick={() => changeAvatarState()}>
                                        <img src='/assets/svg/profile-edit.svg' />
                                    </span>
                                </div>
                                {avatarBtn ?
                                    <div className='flex w-full items-center gap-3'>
                                        <div className="mt-6">
                                            <label className="flex flex-row items-center justify-center py-3 px-4 gap-3 rounded-md min-w-[140px] text-primary border-2 border-primary font-medium dark:text-primary-light dark:border-primary-light disabled:opacity-40">
                                                <span className="">Change Avatar</span>
                                                <input
                                                    type='file'
                                                    {...register("imageUrl")}
                                                    onChange={(e) => onSubmit(e)}
                                                    className="hidden"
                                                />
                                            </label>
                                            {/* <Button
                                                variant="outline"
                                                type="submit"
                                                //loading={loading}
                                                //disabled={loading}
                                            >
                                                <span className="text-primary border border-primary font-medium',
						'dark:text-primary-light dark:border-primary-light',
						'disabled:opacity-40">Select a file</span>
                                                <input type='file' className="hidden" />
                                            </Button> */}
                                        </div>
                                        <div className="mt-6">
                                            <Button
                                                variant="grey"
                                                // type="submit"
                                                //loading={loading}
                                                //disabled={loading}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div> : <></>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            {/* </form> */}
        </>
    );
};
export default withAuthentication(ProfileAvatar, { displayName: 'ProfileAvatar' });