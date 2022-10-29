import React from "react"
import { Image, Text, View } from "react-native"

const NewListCardItem = () => {
  return (
    <View>
      <View>
        <Image source={require("../../../../../assets/images/Ruslan.png")}></Image>
        <Text>Ruslan Konviser</Text>
        <View>
          <Text>Estimate Now</Text>
        </View>
        <Image source={require("../../../../../assets/icons/more-vertical.png")}></Image>
      </View>
      <Text>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</Text>
      <View></View>
      <View>
        <View>
          <Text>Current time</Text>
          <Text>02:25:15</Text>
        </View>
        <View>
          <Text>Total time</Text>
          <Text>07:22</Text>
        </View>
      </View>
    </View>
  )
}

export default NewListCardItem
