import React from "react"
import { View, Text } from "react-native"

export type AuthenticatedProfileScreenProps = Record<string, unknown>

export const AuthenticatedProfileScreen: React.FC<AuthenticatedProfileScreenProps> = () => {
  return (
    <View>
      <Text>ProfileScreen</Text>
    </View>
  )
}
