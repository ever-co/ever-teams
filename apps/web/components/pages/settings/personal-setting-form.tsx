/* eslint-disable no-mixed-spaces-and-tabs */
import ToggleThemeContainer from '@components/layout/toggleThemeBtns';
import { withAuthentication } from 'lib/app/authenticator';
import {
    Button,
    InputField,
	Text,
} from 'lib/components';
import { LanguageDropDown } from './language-dropdown';
import { TimezoneDropDown } from './timezone-dropdown';
import { useForm } from "react-hook-form";
import { useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { userTimezone } from '@app/helpers';


const PersonalSettingForm = () => {
    // const { user } = useAuthenticateUser();
    const [user, setUser] = useRecoilState(userState);
    const { register, setValue, handleSubmit } = useForm();
    const [currectTimezone, setCurrectTimezone] = useState('')
    useEffect(() => {
        setValue('firstName', user?.firstName)
        setValue('lastName', user?.lastName)
        setValue('email', user?.email)
    },[user])

    const onSubmit =(values:any) => {

        console.log(values)
    }
    return (
        <>
            <form
                className="w-[98%] md:w-[530px]"
                onSubmit={handleSubmit(onSubmit)}
                autoComplete="off"
            >
                <div className="flex flex-col justify-between items-center">
                    <div className="w-full mt-5">
                        <div className="">
                            <div className='flex w-full items-center justify-between gap-8'>
                                <div className="flex w-full items-center justify-between gap-4">
                                    <div>
                                        <Text className="text-md text-gray-400 font-normal mb-2">
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
                                        <Text className="text-md text-gray-400 font-normal mb-2">
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
                                        // type="submit"
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </div>
                            <div className="flex w-full items-center justify-between gap-8 mt-8">
                                <div className="flex w-full items-center justify-between gap-4">
                                    <div>
                                        <Text className="text-md text-gray-400 font-normal mb-2">
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
                                            // value="Alexandro Bernard"
                                            //onChange={handleChange}
                                            //errors={errors}
                                            required
                                            className='md:w-[220px]'
                                        />
                                    </div>
                                </div>
                                <div className='mt-6'>
                                    <Button
                                        type="submit"
                                        //loading={loading}
                                        //disabled={loading}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                            <div className='flex items-center gap-6 mt-8'>
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
                                    <TimezoneDropDown currectTimezone={currectTimezone} onChangeTimezone={(e:any) => setCurrectTimezone(e)}/>
                                </div>
                                <div className='mt-6'>
                                    <Button
                                        variant="grey"
                                        type='button'
                                        onClick={() => {
                                            setCurrectTimezone(userTimezone())
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
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
};
export default withAuthentication(PersonalSettingForm, { displayName: 'PersonalSettingForm' });