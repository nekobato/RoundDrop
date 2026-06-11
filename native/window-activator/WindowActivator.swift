import AppKit
import ApplicationServices
import Foundation

struct ActivationResponse: Encodable {
  let activated: Bool
  let focused: Bool
  let status: String
  let error: String?
  let windowId: UInt32?
  let processId: Int32?
  let title: String?
}

struct WindowInfo {
  let id: CGWindowID
  let processId: pid_t
  let title: String?
}

func printResponse(_ response: ActivationResponse) {
  let encoder = JSONEncoder()
  guard let data = try? encoder.encode(response),
        let output = String(data: data, encoding: .utf8)
  else {
    print("{\"activated\":false,\"focused\":false,\"status\":\"encoding-failed\",\"error\":\"Failed to encode activation response\"}")
    exit(1)
  }
  print(output)
}

func parseMediaSourceWindowId(_ mediaSourceId: String) -> CGWindowID? {
  let parts = mediaSourceId.split(separator: ":")
  guard parts.count >= 2,
        parts[0] == "window",
        let value = UInt32(parts[1])
  else {
    return nil
  }
  return CGWindowID(value)
}

func findWindowInfo(windowId: CGWindowID) -> WindowInfo? {
  guard let windowList = CGWindowListCopyWindowInfo(.optionIncludingWindow, windowId) as? [[String: Any]],
        let info = windowList.first,
        let processId = info[kCGWindowOwnerPID as String] as? pid_t
  else {
    return nil
  }

  return WindowInfo(
    id: windowId,
    processId: processId,
    title: info[kCGWindowName as String] as? String
  )
}

func copyAXAttribute(_ element: AXUIElement, _ attribute: CFString) -> CFTypeRef? {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, attribute, &value)
  return error == .success ? value : nil
}

func axWindowNumber(_ element: AXUIElement) -> CGWindowID? {
  guard let value = copyAXAttribute(element, "AXWindowNumber" as CFString) else {
    return nil
  }

  if let number = value as? NSNumber {
    return CGWindowID(number.uint32Value)
  }
  return nil
}

func axWindowTitle(_ element: AXUIElement) -> String? {
  return copyAXAttribute(element, kAXTitleAttribute as CFString) as? String
}

func findAXWindow(for info: WindowInfo) -> AXUIElement? {
  let appElement = AXUIElementCreateApplication(info.processId)
  guard let value = copyAXAttribute(appElement, kAXWindowsAttribute as CFString),
        let windows = value as? [AXUIElement]
  else {
    return nil
  }

  if let exactMatch = windows.first(where: { axWindowNumber($0) == info.id }) {
    return exactMatch
  }

  guard let title = info.title, !title.isEmpty else {
    return nil
  }

  return windows.first(where: { axWindowTitle($0) == title })
}

func raiseAXWindow(_ window: AXUIElement) -> Bool {
  AXUIElementSetAttributeValue(window, kAXMainAttribute as CFString, kCFBooleanTrue)
  AXUIElementSetAttributeValue(window, kAXFocusedAttribute as CFString, kCFBooleanTrue)
  return AXUIElementPerformAction(window, kAXRaiseAction as CFString) == .success
}

func activateApplication(processId: pid_t) -> Bool {
  guard let application = NSRunningApplication(processIdentifier: processId) else {
    return false
  }
  return application.activate(options: [])
}

func isAccessibilityTrusted() -> Bool {
  let options = [
    kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true
  ] as CFDictionary
  return AXIsProcessTrustedWithOptions(options)
}

func activateWindow(mediaSourceId: String) {
  guard let windowId = parseMediaSourceWindowId(mediaSourceId) else {
    printResponse(
      ActivationResponse(
        activated: false,
        focused: false,
        status: "invalid-window-id",
        error: "Invalid desktop capturer window id",
        windowId: nil,
        processId: nil,
        title: nil
      )
    )
    exit(2)
  }

  guard let info = findWindowInfo(windowId: windowId) else {
    printResponse(
      ActivationResponse(
        activated: false,
        focused: false,
        status: "window-not-found",
        error: "Window was not found",
        windowId: windowId,
        processId: nil,
        title: nil
      )
    )
    exit(3)
  }

  let activated = activateApplication(processId: info.processId)
  guard isAccessibilityTrusted() else {
    printResponse(
      ActivationResponse(
        activated: activated,
        focused: false,
        status: "accessibility-permission-required",
        error: "Accessibility permission is required to focus a specific window",
        windowId: info.id,
        processId: info.processId,
        title: info.title
      )
    )
    exit(4)
  }

  guard let axWindow = findAXWindow(for: info) else {
    printResponse(
      ActivationResponse(
        activated: activated,
        focused: false,
        status: "ax-window-not-found",
        error: "Matching accessibility window was not found",
        windowId: info.id,
        processId: info.processId,
        title: info.title
      )
    )
    exit(5)
  }

  let focused = raiseAXWindow(axWindow)
  printResponse(
    ActivationResponse(
      activated: activated,
      focused: focused,
      status: focused ? "focused" : "raise-failed",
      error: focused ? nil : "Failed to raise the selected window",
      windowId: info.id,
      processId: info.processId,
      title: info.title
    )
  )
  exit(focused ? 0 : 6)
}

let arguments = Array(CommandLine.arguments.dropFirst())
guard arguments.count == 2, arguments[0] == "activate" else {
  printResponse(
    ActivationResponse(
      activated: false,
      focused: false,
      status: "invalid-arguments",
      error: "Usage: WindowActivator activate <desktopCapturerSourceId>",
      windowId: nil,
      processId: nil,
      title: nil
    )
  )
  exit(64)
}

activateWindow(mediaSourceId: arguments[1])
