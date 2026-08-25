import { useTranslate } from "@/i18n/use-i18n";
import { Routes } from "@/src";
import * as ImagePath from "@/src/assets/image-path";
import { useDefaultStyle } from "@/src/hooks/use-style";
import { DistortionData } from "@/model";
import { Link } from "expo-router";
import React from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography } from "heroui-native";

export default function Index() {
  const s = useDefaultStyle();
  const t = useTranslate();
  const img = (i: number) => ImagePath.bubbles[i % ImagePath.bubbles.length];
  return (
    <ScrollView style={[s.view]}>
      <SafeAreaView style={[s.view]}>
        <View style={[s.flexCol, s.container]}>
          <View style={[s.flexRow]}>
            <Link
              style={[s.flex1, s.border, s.rounded, s.p2, s.button]}
              target="_blank"
              href="https://freecbt.erosson.org/explanation/?ref=quirk"
            >
              <TouchableOpacity style={[s.flex1]}>
                <Typography type="body-sm">
                  {t("onboarding_screen.header")}
                </Typography>
              </TouchableOpacity>
            </Link>
            <Link
              style={[
                s.flex1,
                s.border,
                s.rounded,
                s.p2,
                s.bg,
                s.textCenter,
                s.p3,
              ]}
              href={Routes.introV2()}
            >
              <TouchableOpacity style={[s.flex1]}>
                <Typography type="body-sm">
                  {t("explanation_screen.intro")}
                </Typography>
              </TouchableOpacity>
            </Link>
          </View>
          {DistortionData.list.map((d, i) => (
            <View key={d.slug} style={[s.my2]}>
              <Typography type="body-sm" className="font-semibold">
                {t(d.labelKey)}
              </Typography>
              {/* <Typography type="body-sm">{t(d.descriptionKey)}</Typography> */}
              <Typography type="body-sm">
                {d.explanationKeys.map((tk) => t(tk)).join("\n\n")}
              </Typography>

              <View style={[s.flexRow, s.my2]}>
                <Image source={img(i)} style={[s.bubble, s.m2]} />
                <Typography type="body-sm" className="rounded-md p-2 border">
                  {" "}
                  {t(d.explanationThoughtKey)}
                </Typography>
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}
