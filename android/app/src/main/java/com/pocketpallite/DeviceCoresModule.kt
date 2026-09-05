package com.pocketpallite

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes Runtime.availableProcessors() -- the JS layer has no way to read
 * CPU core count (react-native-device-info doesn't expose it), and the
 * Benchmark screen's Device Information card needs the real figure, not a
 * guess.
 */
class DeviceCoresModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "DeviceCores"

  @ReactMethod
  fun getCoreCount(promise: Promise) {
    promise.resolve(Runtime.getRuntime().availableProcessors())
  }
}
