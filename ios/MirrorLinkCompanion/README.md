# MirrorLink iOS Screen Mirroring Companion

This native iOS module provides high-framerate, low-latency wireless screen mirroring from iPhone / iPad to the **MirrorLink Windows Desktop Application**.

---

## Supported Modes for iPhone:

### 1. Apple AirPlay (No app installation required)
- When MirrorLink runs on Windows, it advertises an Apple AirPlay receiver service (`_airplay._tcp` on port 7000) over Bonjour / mDNS.
- On your iPhone:
  1. Connect to the **same Wi-Fi** network as your Windows PC.
  2. Open **Control Center** (swipe down from top-right corner).
  3. Tap **Screen Mirroring** (two overlapping rectangles).
  4. Select **MirrorLink (Your PC Name)**.

### 2. Native ReplayKit Broadcast Extension (Companion Mode)
- Built with Apple's `ReplayKit` framework (`RPBroadcastSampleHandler`).
- Captures full device screen at 60 FPS.
- Directly encodes and streams H.264 video to MirrorLink Windows app over local Wi-Fi.

---

## Project Structure:
- `MirrorLinkBroadcast/SampleHandler.swift`: ReplayKit broadcast handler that captures video sample buffers.
