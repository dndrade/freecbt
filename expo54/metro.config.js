const { getDefaultConfig } = require("expo/metro-config.js");
const { withUniwindConfig } = require("uniwind/metro");
const {
    wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(
    wrapWithReanimatedMetroConfig(config),
    {
        cssEntryFile: "./global.css",
        dtsFile: "./src/uniwind-types.d.ts",
    }
);