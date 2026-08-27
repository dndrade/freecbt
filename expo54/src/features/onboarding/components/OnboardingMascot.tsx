import React from "react";
import { Image } from "react-native";
import { dookPink, dookPurple, dookYellow } from "@/src/assets/image-path";

export interface OnboardingMascotProps {
  color: "purple" | "pink" | "yellow";
  size?: number;
}

const SOURCES = { purple: dookPurple, pink: dookPink, yellow: dookYellow };

export const OnboardingMascot: React.FC<OnboardingMascotProps> = ({
  color,
  size = 128,
}) => (
  <Image
    source={SOURCES[color]}
    resizeMode="contain"
    accessibilityRole="image"
    accessibilityLabel="FreeCBT mascot"
    style={{ width: size, height: size }}
  />
);
