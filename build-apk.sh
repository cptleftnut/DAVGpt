#!/bin/bash
# ============================================================
# DAVGpt Android APK Builder
# Run this script on your machine to generate the APK
# Requirements: Java 17+, Android Studio OR Android SDK
# ============================================================

set -e

echo "🔧 DAVGpt APK Builder"
echo "====================="

# Check Java
if ! command -v java &> /dev/null; then
  echo "❌ Java not found. Install JDK 17+ from https://adoptium.net/"
  exit 1
fi
echo "✅ Java: $(java -version 2>&1 | head -1)"

# Check/Set ANDROID_HOME
if [ -z "$ANDROID_HOME" ]; then
  # Common locations
  if [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  elif [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  elif [ -d "/opt/android-sdk" ]; then
    export ANDROID_HOME="/opt/android-sdk"
  else
    echo ""
    echo "❌ ANDROID_HOME not set and Android SDK not found in common locations."
    echo ""
    echo "👉 Options:"
    echo "   1. Install Android Studio: https://developer.android.com/studio"
    echo "      Then set: export ANDROID_HOME=~/Android/Sdk  (Linux)"
    echo "                export ANDROID_HOME=~/Library/Android/sdk  (macOS)"
    echo ""
    echo "   2. Download SDK command line tools only:"
    echo "      https://developer.android.com/studio#command-line-tools-only"
    echo ""
    exit 1
  fi
fi
echo "✅ Android SDK: $ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH"

# Build the APK
echo ""
echo "📦 Building debug APK..."
cd android
chmod +x gradlew

# Accept licenses automatically
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses 2>/dev/null || true

./gradlew assembleDebug --no-daemon 2>&1

APK_PATH=$(find . -name "*.apk" | head -1)
if [ -n "$APK_PATH" ]; then
  echo ""
  echo "✅ APK built successfully!"
  echo "📱 APK location: android/$APK_PATH"
  echo ""
  echo "To install on a connected Android device:"
  echo "  adb install $APK_PATH"
else
  echo "❌ APK not found after build"
  exit 1
fi
