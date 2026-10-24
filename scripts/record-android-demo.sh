#!/usr/bin/env bash
set -euo pipefail

# Record the real running Android app on a connected phone or emulator.
# Run from anywhere after starting the API + React Native app and signing in.
# Android screenrecord has a 180-second maximum recording duration.

if ! command -v adb >/dev/null 2>&1; then
  echo 'adb was not found. Install Android SDK Platform Tools and add it to PATH.' >&2
  exit 1
fi
if ! adb get-state 2>/dev/null | grep -qx device; then
  echo 'No adb device connected. Start an emulator or enable USB debugging.' >&2
  exit 1
fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="${1:-$ROOT/MiniLedger-real-demo.mp4}"
REMOTE="/sdcard/miniledger-recording-$$.mp4"

echo 'Recording starts now. Interact with the ACTUAL running MiniLedger app.'
echo 'Show login/OTP, loan creation, red overdue, summary, and repayment.'
echo 'Screenrecord stops automatically after 180 seconds. Do not close this terminal.'
adb shell screenrecord --time-limit 180 --bit-rate 4000000 "$REMOTE"
adb pull "$REMOTE" "$OUTPUT"
adb shell rm -f "$REMOTE"
echo "Saved the real Android screen recording to: $OUTPUT"
echo 'Upload this MP4 to Loom or Google Drive, then share the viewable URL.'
