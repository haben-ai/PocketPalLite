package com.zayla

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Holds Android's attention while a response is generating and the app is
 * minimized. llama.rn's actual token generation already runs on its own
 * native thread pool (RNLlama.java's Executors.newCachedThreadPool()) --
 * independent of React Native's JS thread -- so backgrounding never stalls
 * generation directly. Without this service, though, the whole app process
 * is just an ordinary background process to Android, and OEM battery
 * managers (ColorOS especially) throttle or kill those to save power,
 * cutting a response off mid-generation. Starting this as a real foreground
 * service (with the notification Android requires for one) signals that
 * this process is doing user-visible work, so it survives until the
 * response actually finishes -- ChatScreen.tsx's runCompletion() starts it
 * right before calling engine.completion() and stops it in a finally block
 * covering every exit path (success, error, user-stopped).
 */
class GenerationForegroundService : Service() {

  companion object {
    private const val CHANNEL_ID = "generation"
    private const val NOTIFICATION_ID = 1001
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIFICATION_ID, buildNotification())
    // Not sticky -- if Android kills the process anyway, the in-progress
    // completion() call and its JS/native state are already gone with it,
    // so restarting a bare service afterwards would have nothing to resume.
    return START_NOT_STICKY
  }

  private fun buildNotification(): Notification {
    ensureChannel()

    val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      openAppIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(getString(R.string.app_name))
      .setContentText("Generating a response...")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setSilent(true)
      .build()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(
          CHANNEL_ID,
          "Response generation",
          NotificationManager.IMPORTANCE_LOW,
        ).apply {
          description = "Shown while Zayla is generating a reply in the background."
        },
      )
    }
  }
}
