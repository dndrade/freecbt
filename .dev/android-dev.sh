#!/usr/bin/env sh
set -eu

ADB_HOST="${ADB_HOST:-$(ip route show default | awk '/default/ { print $3; exit }')}"
ADB_PORT="${ADB_PORT:-5038}"
ANDROID_SERIAL="${ANDROID_SERIAL:-emulator-5554}"
METRO_PORT="${METRO_PORT:-8081}"

export ADB_SERVER_SOCKET="tcp:${ADB_HOST}:${ADB_PORT}"
export ANDROID_SERIAL

printf '\n=== Android dev setup ===\n'
printf 'ADB relay:  %s:%s\n' "$ADB_HOST" "$ADB_PORT"
printf 'Emulator:   %s\n' "$ANDROID_SERIAL"
printf 'Metro port: %s\n\n' "$METRO_PORT"

printf '%s\n' '=== Connected devices ==='
adb devices -l

if ! adb get-state >/dev/null 2>&1; then
    printf '\nError: emulator %s is not available through the ADB relay.\n' \
        "$ANDROID_SERIAL" >&2
    exit 1
fi

printf '\n%s\n' '=== Creating Metro reverse tunnel ==='
adb reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}"

printf '\n%s\n' '=== Active reverse tunnels ==='
adb reverse --list

printf '\n%s\n\n' 'ADB relay and Metro tunnel are ready.'

if [ "$#" -gt 0 ]; then
    exec "$@"
fi
