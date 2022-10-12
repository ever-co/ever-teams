import React from "react"
import { View, Text } from "react-native"

export type AuthenticatedHomeScreenProps = Record<string, unknown>

export const AuthenticatedHomeScreen: React.FC<AuthenticatedHomeScreenProps> = () => {
  return (
    <View>
      <Text>HomeScreen</Text>
    </View>
  )
}
