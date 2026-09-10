package com.pocketpallite

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * JS entry point for GenerationForegroundService -- see that class's doc
 * comment for why this exists. start/stop are idempotent from Android's own
 * side (starting an already-started service or stopping an already-stopped
 * one is a no-op), so callers don't need to track state themselves beyond
 * what ChatScreen.tsx's try/finally around engine.completion() already does.
 */
class GenerationServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "GenerationService"

  @ReactMethod
  fun startGenerating(promise: Promise) {
    try {
      val intent = Intent(reactApplicationContext, GenerationForegroundService::class.java)
      ContextCompat.startForegroundService(reactApplicationContext, intent)
      promise.resolve(null)
    } catch (e: Exception) {
      // Best-effort -- a failure here (e.g. background-start restrictions
      // on some OEM skins) shouldn't block the reply itself, just means it
      // won't be protected from being killed while backgrounded.
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun stopGenerating(promise: Promise) {
    try {
      reactApplicationContext.stopService(
        Intent(reactApplicationContext, GenerationForegroundService::class.java),
      )
    } catch (e: Exception) {
      // Ignore -- nothing meaningful to recover from a stop failure.
    }
    promise.resolve(null)
  }
}
