import React, { FC, useState } from "react"
import { View } from "react-native"
import { IPopup } from "..";
import { useSettings } from "../../../../services/hooks/features/useSettings";
import ChangeUserAvatar from "./ChangeUserAvatar"
import UpdateFullNameForm from "./UpdateFullNameForm"
interface IBottomProps {
    onDismiss: () => unknown;
    openBottomSheet?: (sheet: IPopup) => unknown;
    openedSheet: IPopup
}

const BottomSheetContent: FC<IBottomProps> = ({ onDismiss, openBottomSheet, openedSheet }) => {
    const { user, isLoading, updateUserIfo } = useSettings()
    return (
        <View style={{ width: "100%"}}>
            <View>
                {openedSheet === "Names" ?
                    <UpdateFullNameForm
                        user={user}
                        onUpdateFullName={updateUserIfo}
                        onDismiss={() => onDismiss()} /> : null
                }
                {openedSheet === "Avatar" ?
                    <ChangeUserAvatar
                        onExtend={() => openBottomSheet("Avatar 2")}
                        onDismiss={() => onDismiss()} />
                    : null
                }
            </View>
        </View>
    )
}

export default BottomSheetContent;