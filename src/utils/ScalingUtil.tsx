import { Dimensions } from "react-native";

const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const Screen = {
  ////
  get screenWidth() {
    return Dimensions.get("window").width;
  },
  ////
  get screenHeight() {
    return Dimensions.get("window").height;
  },
  ////
};

export const verticalScale = (size: number) =>
  (Screen.screenHeight / guidelineBaseHeight) * size;
export const horizontalScale = (size: number) =>
  (Screen.screenWidth / guidelineBaseWidth) * size;

export default Screen;
