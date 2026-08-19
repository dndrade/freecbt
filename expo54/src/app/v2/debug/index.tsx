import { Redirect } from "expo-router";
import React from "react";

export default function DebugIndex() {
  return <Redirect href="/v2/debug/lab" />;
}
