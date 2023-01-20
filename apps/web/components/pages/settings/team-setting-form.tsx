/* eslint-disable no-mixed-spaces-and-tabs */
import ToggleThemeContainer from '@components/layout/toggleThemeBtns';
import { withAuthentication } from 'lib/app/authenticator';
import {
    Button,
    InputField,
	RadioButtonField,
	Text,
} from 'lib/components';
import { LanguageDropDown } from './language-dropdown';
import { TimezoneDropDown } from './timezone-dropdown';
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { userTimezone } from '@app/helpers';
import { useSettings } from '@app/hooks';


const TeamSettingForm = () => {
    const [user] = useRecoilState(userState);
    const { register, setValue, handleSubmit } = useForm();
    const [currentTimezone, setCurrentTimezone] = useState("");
    const { updateAvatar } = useSettings();

    useEffect(() => {
        setValue('firstName', user?.firstName)
        setValue('lastName', user?.lastName)
        setValue('email', user?.email)
    },[user, currentTimezone])

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
                className="w-[98%] md:w-[930px]"
                onSubmit={handleSubmit(onSubmit)}
                autoComplete="off"
            >
                <div className="flex flex-col justify-between items-center">
                    <div className="w-full mt-5">
                        <div className="">
                            <div className="flex w-full items-center justify-between gap-12">
                                <Text className="flex-none flex-grow-0 text-md text-gray-400 font-normal mb-2 w-1/5">
                                    Team Name
                                </Text>
                                <div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
                                    <InputField
                                        type="text"
                                        // placeholder="First Name"
                                        {...register("teamName", { required: true, maxLength: 80 })}
                                        className=''
                                    />
                                </div> 
                            </div>
                            <div className="flex w-full items-center justify-between gap-12 mt-8">
                                <Text className="flex-none flex-grow-0 text-md text-gray-400 font-normal mb-2 w-1/5">
                                    Team Type
                                </Text>
                                <div className="flex flex-grow-0 items-center justify-between w-1/4">
                                    <div className="flex w-full items-center justify-between gap-4">
                                        <div>
                                        <input id="default-radio-1" type="radio" value="" name="default-radio" className="w-4 h-4 text-[#3826A6] bg-gray-100 border-gray-300 focus:ring-[#3826A6] dark:focus:ring-[#3826A6] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                        <label htmlFor="default-radio-1" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Default radio</label>
                                        </div>
                                        <div>
                                        <input checked id="default-radio-2" type="radio" value="" name="default-radio" className="w-4 h-4 text-[#3826A6] bg-gray-100 border-gray-300 focus:ring-[#3826A6] dark:focus:ring-[#3826A6] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                        <label htmlFor="default-radio-2" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Checked state</label>
                                        </div>
                                    </div>
                                </div>
                                <div className='flex gap-4'>
                                    <div className='flex flex-row flex-grow-0 items-center justify-between w-64'>
                                        <InputField
                                            type="text"
                                            placeholder="https://teamA.gauzy.com"
                                            // value="Alexandro Bernard"
                                            //onChange={handleChange}
                                            //errors={errors}
                                            // required
                                            className=''
                                        />
                                    </div>
                                    <div className='flex flex-row flex-grow-0 items-center justify-between w-1/5'>
                                        <Button
                                            type="submit"
                                            variant='outline'
                                            //loading={loading}
                                            //disabled={loading}
                                        >
                                            Copy Link
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {/* <div className='flex items-center gap-6 mt-8'>
                                <div className="">
                                    <Text className="text-md text-gray-400 font-normal mb-2">
                                        Theme
                                    </Text>
                                    <ToggleThemeContainer />
                                </div>
                                <div className="mt-6">
                                    <Text className="text-sm text-gray-400 font-normal">
                                        Light Mode
                                    </Text>
                                </div>
                            </div>
                            <div className='flex w-full items-center justify-between mt-8'>
                                <div className="">
                                    <Text className="text-md text-gray-400 font-normal mb-2">
                                        Language
                                    </Text>
                                    <LanguageDropDown  />
                                </div>
                            </div>
                            <div className='flex w-full items-center justify-between mt-8 gap-5'>
                                <div className="">
                                    <Text className="text-md text-gray-400 font-normal mb-2">
                                        Timezone
                                    </Text>
                                    <TimezoneDropDown currentTimezone={currentTimezone} onChangeTimezone={(e:any) => setCurrentTimezone(e.data)}/>
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
                            <div className='flex w-full items-center justify-between mt-8'>
                                <div className="">
                                    <Text className="text-md text-gray-400 font-normal mb-2">
                                        Work Schedule
                                    </Text>
                                    <Text className='text-md font-PlusJakartaSansSemiBold'>No</Text>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
};
export default withAuthentication(TeamSettingForm, { displayName: 'TeamSettingForm' });