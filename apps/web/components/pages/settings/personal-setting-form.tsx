/* eslint-disable no-mixed-spaces-and-tabs */
import { withAuthentication } from 'lib/app/authenticator';
import {
    Button,
    InputField,
	Text,
    ThemeToggler,
} from 'lib/components';
import { LanguageDropDown } from './language-dropdown';
import { TimezoneDropDown } from './timezone-dropdown';
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { userTimezone } from '@app/helpers';
import { useSettings } from '@app/hooks';
import { useTheme } from 'next-themes';


const PersonalSettingForm = () => {
    const [user] = useRecoilState(userState);
    const { register, setValue, handleSubmit } = useForm();
    const [currentTimezone, setCurrentTimezone] = useState("");
    const { updateAvatar } = useSettings();
    const { theme } = useTheme();

    useEffect(() => {
        setValue('firstName', user?.firstName)
        setValue('lastName', user?.lastName)
        setValue('email', user?.email)
    },[user, currentTimezone, setValue])

    const onSubmit = useCallback(async (values:any) => {
        if (values && user) {
            await updateAvatar({firstName: values.firstName, lastName: values.lastName, email: values.email, id: user.id});
        }
    }, [updateAvatar, user]);

    const handleDetectTimezone = () => {
        setCurrentTimezone(userTimezone());
    }
    return (
        <>
            <form
                className="w-[98%] md:w-[530px]"
                onSubmit={handleSubmit(onSubmit)}
                autoComplete="off"
            >
                <div className="flex flex-col items-center justify-between">
                    <div className="w-full mt-5">
                        <div className="">
                            <div className='flex items-center justify-between w-full gap-8'>
                                <div className="flex items-center justify-between w-full gap-4">
                                    <div>
                                        <Text className="mb-2 font-normal text-gray-400 text-md">
                                            First Name
                                        </Text>
                                        <InputField
                                            type="text"
                                            placeholder="First Name"
                                            {...register("firstName", { required: true, maxLength: 80 })}
                                            className='md:w-[220px] m-0'
                                        />
                                    </div>
                                    <div className="">
                                        <Text className="mb-2 font-normal text-gray-400 text-md">
                                            Last Name
                                        </Text>
                                        <InputField
                                            type="text"
                                            placeholder="Last Name"
                                            {...register("lastName", { required: true, maxLength: 80 })}
                                            className='md:w-[220px] m-0'
                                        />
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <Button
                                        variant="grey"
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between w-full gap-8 mt-8">
                                <div className="flex items-center justify-between w-full gap-4">
                                    <div>
                                        <Text className="mb-2 font-normal text-gray-400 text-md">
                                            Contact
                                        </Text>
                                        <InputField
                                            type="email"
                                            placeholder="Email Address"
                                            {...register("email", {
                                                required: true,
                                                pattern: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                                              })}
                                            className='md:w-[220px]'
                                        />
                                    </div>
                                    <div className='mt-8'>
                                        <InputField
                                            type="text"
                                            placeholder="Phone Number"
                                            className='md:w-[220px]'
                                        />
                                    </div>
                                </div>
                                <div className='mt-6'>
                                    <Button
                                        type="submit"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                            <div className='flex items-center gap-6 mt-8'>
                                <div className="">
                                    <Text className="mb-2 font-normal text-gray-400 text-md">
                                        Theme
                                    </Text>
                                    <ThemeToggler />
                                </div>
                                <div className="mt-8">
                                    <Text className="text-sm font-normal text-gray-400">
                                        {theme === 'light' ? 'Light' : 'Dark'} Mode
                                    </Text>
                                </div>
                            </div>
                            <div className='flex items-center justify-between w-full mt-8'>
                                <div className="">
                                    <Text className="mb-2 font-normal text-gray-400 text-md">
                                        Language
                                    </Text>
                                    <LanguageDropDown  />
                                </div>
                            </div>
                            <div className='flex items-center justify-between w-full gap-5 mt-8'>
                                <div className="">
                                    <Text className="mb-2 font-normal text-gray-400 text-md">
                                        Timezone
                                    </Text>
                                    <TimezoneDropDown currentTimezone={currentTimezone} onChangeTimezone={(e:any) => setCurrentTimezone(e.data)} />
                                </div>
                                <div className='mt-8'>
                                    <Button
                                        variant="grey"
                                        type='button'
                                        onClick={() => {
                                            handleDetectTimezone()
                                        }}
                                    >
                                        Detect
                                    </Button>
                                </div>
                            </div>
                            <div className='flex items-center justify-between w-full mt-8'>
                                <div className="">
                                    <Text className="mb-2 font-normal text-gray-400 text-md">
                                        Work Schedule
                                    </Text>
                                    <Text className='text-md font-normal'>No</Text>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
};
export default withAuthentication(PersonalSettingForm, { displayName: 'PersonalSettingForm' });
