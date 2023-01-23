/* eslint-disable no-mixed-spaces-and-tabs */
import { withAuthentication } from 'lib/app/authenticator';
import {
    Button,
    Text,
} from 'lib/components';

const DangerZone = () => {
    return (
        <>
            <div className="flex flex-col justify-between items-center">
                    <div className="w-full mt-5">
                        <div className="">
                            <div className='flex w-full items-center justify-between gap-6'>
                                <div className="flex-auto w-64">
                                    <Text className="text-xl text-[#282048] font-semibold">
                                        Remove Account
                                    </Text>
                                </div>
                                <div className="flex-auto w-64">
                                    <Text className="text-md text-gray-400 font-normal mb-2">
                                        Account will be removed from all teams, except where you are only the manager
                                    </Text>
                                </div>
                                <div className="flex-auto w-32 mt-6">
                                    <Button
                                        variant="danger"
                                        type="submit"
                                        className='float-right'
                                    >
                                        Remove Everywhere
                                    </Button>
                                </div>
                            </div>
                            <div className='flex w-full items-center justify-between gap-6'>
                                <div className="flex-auto w-64">
                                    <Text className="text-xl text-[#282048] font-semibold">
                                        Delete Account
                                    </Text>
                                </div>
                                <div className="flex-auto w-64">
                                    <Text className="text-md text-gray-400 font-normal mb-2">
                                        Your Account will be deleted permanently with removing from all teams
                                    </Text>
                                </div>
                                <div className="flex-auto w-32 mt-6">
                                    <Button
                                        variant="danger"
                                        type="submit"
                                        className='float-right'
                                    >
                                        Delete This Account
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        </>
    );
};
export default withAuthentication(DangerZone, { displayName: 'DangerZone' });