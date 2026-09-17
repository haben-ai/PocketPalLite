# Privacy Policy for Zayla

**Last updated:** September 12, 2026

Zayla ("the App," "we," "us") is an on-device AI chat application. This policy explains what data the App handles, where it goes, and what it never does. If anything below ever changes, this policy will be updated to match.

## The short version

- **Your chats never leave your device.** There is no Zayla server, and we do not operate any backend that receives your conversations.
- **No account, no sign-up, no login.** The App does not ask who you are.
- **No analytics, no trackers, no advertising.** The App does not include any analytics SDK, crash-reporting service, or ad network.
- **AI models run locally**, entirely on your phone's hardware, once downloaded.

## What data the App accesses, and why

### 1. Conversations and chat history
Every message you send and every reply the AI generates is processed locally on your device using an on-device language model. Conversation history is saved only in the App's local storage on your phone. It is never transmitted to us or to any third party, and there is no cloud backup or sync feature.

### 2. AI model downloads
To chat, you first download an AI model file (a few hundred megabytes to a few gigabytes) from Hugging Face, a third-party model hosting service, directly from your device. This is a one-way download of a public model file — no personal data or usage information is sent as part of that download beyond what's inherently needed for the HTTP request itself (e.g. your device's IP address, which Hugging Face sees the same way any website would). We do not operate or control Hugging Face's service; see their own privacy policy for how they handle that request.

If you use a personal Hugging Face access token (an optional setting, for downloading gated/restricted models), it is stored securely on-device using your platform's secure credential storage (Android Keystore / iOS Keychain) and is only ever sent to Hugging Face itself to authorize your downloads — never to us.

### 3. Optional internet search (Brave Search)
The App includes an optional feature that lets an AI persona search the web to help answer your questions. This feature is **off by default** and requires you to:
1. Explicitly acknowledge a disclosure that search queries leave your device, and
2. Provide your own Brave Search API key.

When enabled, your search query text is sent directly from your device to Brave's search API using your own key. Zayla has no server in this path and never receives, stores, or has access to your search queries or your API key beyond storing the key securely on your device. If you don't enable this feature, no query ever leaves your device.

### 4. Images (vision-capable models only)
If you use a model with image-understanding support, you may attach a photo from your camera or photo library to a message. That image is processed entirely on-device by the local AI model. It is never uploaded anywhere.

### 5. Text-to-speech and translation
Reading replies aloud and translating text both run through on-device engines. No text is sent anywhere for either feature.

### 6. Device information
The App reads basic, non-identifying device information — available RAM, CPU core count, free storage, device model name, OS version — to recommend an appropriately sized AI model and to run optional on-device performance benchmarks you initiate yourself. This information stays on your device and is used only to power these in-app features. It is never transmitted to us.

### 7. Notifications
The App can show a local notification when a response finishes generating while it's running in the background. These notifications are generated and displayed entirely on-device by the operating system; no push-notification server is involved, and Zayla cannot see or send you notifications remotely.

## What we don't do

- We don't collect your name, email, or any account information, because there is no account.
- We don't run analytics, crash reporting, or usage tracking of any kind.
- We don't serve ads or share data with advertisers.
- We don't sell or share your data with third parties, because we don't collect it in the first place.
- We don't have a server that stores your conversations, images, or files.

## Third-party services

The only third-party services the App talks to, and only when you take the specific action that triggers them, are:

| Service | When it's contacted | What's sent |
|---|---|---|
| Hugging Face | When you download an AI model | Standard HTTP request data (e.g. IP address), plus your HF token if you've set one |
| Brave Search | Only if you enable Internet Search and a persona performs a search | Your search query text, using your own API key |

Each of these services has its own privacy policy governing how they handle requests made to them; we encourage you to review those directly.

## Children's privacy

The App does not knowingly collect personal information from anyone, including children, because it does not collect personal information from any user. AI-generated responses may not always be appropriate for all ages — parental discretion is advised.

## Data retention and deletion

Since all data (conversations, downloaded models, settings) lives only in the App's local storage on your device, you control it directly:
- Deleting a conversation removes it immediately from your device.
- Uninstalling the App removes all of its local data, including chat history and downloaded models.

There is no copy of your data anywhere else to delete, because none was ever created.

## Changes to this policy

If this policy changes, the "Last updated" date at the top will be revised, and material changes will be reflected in an updated version of the App where practical.

## Contact

If you have questions about this privacy policy, contact: **eriland707@gmail.com**
