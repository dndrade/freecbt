import { Redirect } from "expo-router";
import { Routes } from "..";

export default function Index() {
  return <Redirect href={Routes.homeV2()} />;
}
