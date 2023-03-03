import React, { FC, useState } from "react"
import { View } from "react-native"
import { IPopup } from "..";
import { useSettings } from "../../../../services/hooks/features/useSettings";
import ChangeUserAvatar from "./ChangeUserAvatar"
import UpdateContactForm from "./ContactInfoForm";
import UpdateFullNameForm from "./UpdateFullNameForm"

interface IBottomProps {
    onDismiss: () => unknown;
    openBottomSheet?: (sheet: IPopup, snapPoint:number) => unknown;
    openedSheet: IPopup
}

const BottomSheetContent: FC<IBottomProps> = ({ onDismiss, openBottomSheet, openedSheet }) => {
    const { user, isLoading, updateUserInfo } = useSettings()
    return (
        <View style={{ width: "100%" }}>
            <View>
                {openedSheet === "Names" ?
                    <UpdateFullNameForm
                        user={user}
                        onUpdateFullName={updateUserInfo}
                        onDismiss={() => onDismiss()} /> : null
                }
                {openedSheet === "Avatar" ?
                    <ChangeUserAvatar
                        onExtend={() => openBottomSheet("Avatar 2",2)}
                        onDismiss={() => onDismiss()} />
                    : null
                }
                {openedSheet === "Contact" ?
                    <UpdateContactForm
                        user={user}
                        onUpdateContactInfo={updateUserInfo}
                        onDismiss={() => onDismiss()}
                    /> : null}
                
            </View>
        </View>
    )
}

export default BottomSheetContent;