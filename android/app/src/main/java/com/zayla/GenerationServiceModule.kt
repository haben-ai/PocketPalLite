package com.zayla

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
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

  companion object {
    private const val COMPLETION_CHANNEL_ID = "generation_complete"
    private const val COMPLETION_NOTIFICATION_ID = 1002
  }

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

  /**
   * Posts a plain, dismissible notification once a reply finishes while the
   * app is backgrounded -- separate from GenerationForegroundService's
   * ongoing "Generating..." one (already gone by the time this fires, via
   * stopGenerating()). Titled with the user's own question so it reads at a
   * glance in the notification shade, like ChatGPT's completion push. No
   * timeout is set, so unlike the ongoing generation notification this
   * stays in the shade until the user taps it (opens the app and clears it)
   * or swipes it away themselves.
   */
  @ReactMethod
  fun showCompletionNotification(question: String, promise: Promise) {
    try {
      ensureCompletionChannel()
      val title = question.ifBlank { "Zayla" }
      val openAppIntent = reactApplicationContext.packageManager
        .getLaunchIntentForPackage(reactApplicationContext.packageName)?.apply {
          flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
      val contentIntent = PendingIntent.getActivity(
        reactApplicationContext,
        0,
        openAppIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val notification = NotificationCompat.Builder(reactApplicationContext, COMPLETION_CHANNEL_ID)
        .setContentTitle(title)
        .setContentText("Reply ready -- tap to view")
        .setStyle(NotificationCompat.BigTextStyle().bigText(title))
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentIntent(contentIntent)
        .setAutoCancel(true)
        .build()
      NotificationManagerCompat.from(reactApplicationContext)
        .notify(COMPLETION_NOTIFICATION_ID, notification)
    } catch (e: Exception) {
      // Best-effort, same discipline as start/stopGenerating above -- a
      // missed notification shouldn't surface as an error to the chat flow.
    }
    promise.resolve(null)
  }

  private fun ensureCompletionChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = reactApplicationContext.getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(COMPLETION_CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(
          COMPLETION_CHANNEL_ID,
          "Reply ready",
          NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
          description = "Shown when Zayla finishes a reply while the app is in the background."
        },
      )
    }
  }
}
