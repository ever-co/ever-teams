import React from "react"
import { View } from "react-native"

// COMPONENTS
import { Icon, Card, Text, TextField } from "."

// STYLES
import { GLOBAL_STYLE as GS } from "../../assets/ts/styles"
import { colors } from "../theme"

export type HeaderCardProps = {
  label?: string
  options?: unknown[]
  placeHolder?: string
}

export interface SelectCardProps extends HeaderCardProps {
  FooterComponent?: React.ReactElement<any, string | React.JSXElementConstructor<any>>
}

export const HeaderCard: React.FC<HeaderCardProps> = ({ label }) => (
  <View style={{ ...GS.inlineItems }}>
    {label && (
      <Text size="md" weight="semiBold" style={{ ...GS.mr2 }}>
        {label}
      </Text>
    )}
    <TextField
      placeholder="Create_dashboard"
      containerStyle={{ ...GS.flex1 }}
      inputWrapperStyle={{
        ...GS.bgTransparent,
        ...GS.rounded,
        borderColor: colors.palette.primary600,
      }}
      RightAccessory={(props) => (
        <Icon
          icon="caretRight"
          containerStyle={props.style}
          color={colors.palette.primary600}
          size={21}
        />
      )}
    />
  </View>
)

export const SelectCard: React.FC<SelectCardProps> = (props) => {
  return (
    <View style={{ ...GS.mb3 }}>
      <Card
        HeadingComponent={<HeaderCard {...props} />}
        style={{ ...GS.p3, ...GS.mb2, ...GS.shadow, minHeight: null || null }}
      />
      {props.FooterComponent}
    </View>
  )
}
