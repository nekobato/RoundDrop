import AppKit
import ApplicationServices
import Foundation

let APP_ICON_SIZE = NSSize(width: 64, height: 64)

struct ActivationResponse: Encodable {
  let activated: Bool
  let focused: Bool
  let status: String
  let error: String?
  let windowId: UInt32?
  let processId: Int32?
  let title: String?
}

struct RunningWindowResponse: Encodable {
  let id: String
  let title: String
  let appIcon: String?
}

struct WindowListResponse: Encodable {
  let windows: [RunningWindowResponse]
}

struct WindowInfo {
  let id: CGWindowID
  let processId: pid_t
  let title: String?
}

func printResponse<T: Encodable>(_ response: T) {
  let encoder = JSONEncoder()
  guard let data = try? encoder.encode(response),
        let output = String(data: data, encoding: .utf8)
  else {
    print("{\"activated\":false,\"focused\":false,\"status\":\"encoding-failed\",\"error\":\"Failed to encode activation response\"}")
    exit(1)
  }
  print(output)
}

func stringValue(_ value: Any?) -> String? {
  guard let string = value as? String else {
    return nil
  }
  let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
  return trimmed.isEmpty ? nil : trimmed
}

func numberValue(_ value: Any?) -> NSNumber? {
  if let number = value as? NSNumber {
    return number
  }
  if let integer = value as? Int {
    return NSNumber(value: integer)
  }
  if let unsignedInteger = value as? UInt32 {
    return NSNumber(value: unsignedInteger)
  }
  return nil
}

func cgWindowId(_ value: Any?) -> CGWindowID? {
  guard let number = numberValue(value) else {
    return nil
  }
  return CGWindowID(number.uint32Value)
}

func windowBounds(_ info: [String: Any]) -> CGRect? {
  guard let bounds = info[kCGWindowBounds as String] as? [String: Any],
        let x = numberValue(bounds["X"]),
        let y = numberValue(bounds["Y"]),
        let width = numberValue(bounds["Width"]),
        let height = numberValue(bounds["Height"])
  else {
    return nil
  }

  return CGRect(
    x: x.doubleValue,
    y: y.doubleValue,
    width: width.doubleValue,
    height: height.doubleValue
  )
}

func displayWindowTitle(ownerName: String?, windowName: String?) -> String {
  guard let windowName else {
    return ownerName ?? "名称未設定のウィンドウ"
  }

  guard let ownerName, ownerName != windowName else {
    return windowName
  }

  return "\(ownerName) - \(windowName)"
}

func isListableWindow(_ info: [String: Any]) -> Bool {
  guard cgWindowId(info[kCGWindowNumber as String]) != nil,
        numberValue(info[kCGWindowOwnerPID as String]) != nil,
        numberValue(info[kCGWindowLayer as String])?.intValue == 0,
        numberValue(info[kCGWindowAlpha as String])?.doubleValue != 0,
        let bounds = windowBounds(info),
        bounds.width > 0,
        bounds.height > 0
  else {
    return false
  }

  return true
}

func pngDataURL(from image: NSImage) -> String? {
  guard image.size.width > 0, image.size.height > 0 else {
    return nil
  }

  let scaledImage = NSImage(size: APP_ICON_SIZE)
  let destinationRect = NSRect(origin: .zero, size: APP_ICON_SIZE)
  let sourceRect = NSRect(origin: .zero, size: image.size)

  scaledImage.lockFocus()
  image.draw(
    in: destinationRect,
    from: sourceRect,
    operation: .copy,
    fraction: 1.0
  )
  scaledImage.unlockFocus()

  guard let tiffData = scaledImage.tiffRepresentation,
        let bitmap = NSBitmapImageRep(data: tiffData),
        let pngData = bitmap.representation(using: .png, properties: [:])
  else {
    return nil
  }

  return "data:image/png;base64,\(pngData.base64EncodedString())"
}

func appIconDataURL(processId: pid_t) -> String? {
  guard let application = NSRunningApplication(processIdentifier: processId)
  else {
    return nil
  }

  let image = application.bundleURL
    .map { NSWorkspace.shared.icon(forFile: $0.path) }
    ?? application.icon

  guard let image else {
    return nil
  }

  return pngDataURL(from: image)
}

func runningApplication(processId: pid_t) -> NSRunningApplication? {
  return NSRunningApplication(processIdentifier: processId)
}

func isActivatableApplication(processId: pid_t) -> Bool {
  guard let application = runningApplication(processId: processId) else {
    return false
  }

  return application.activationPolicy != .prohibited
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
  let options: CGWindowListOption = [.optionAll, .excludeDesktopElements]
  guard let windowList = CGWindowListCopyWindowInfo(
    options,
    kCGNullWindowID
  ) as? [[String: Any]],
        let info = windowList.first(where: {
          cgWindowId($0[kCGWindowNumber as String]) == windowId
        }),
        let processId = numberValue(info[kCGWindowOwnerPID as String])?.int32Value
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

func canInspectAccessibilityWindows() -> Bool {
  return AXIsProcessTrusted()
}

func listWindows() {
  let options: CGWindowListOption = [.optionAll, .excludeDesktopElements]
  guard let windowList = CGWindowListCopyWindowInfo(
    options,
    kCGNullWindowID
  ) as? [[String: Any]]
  else {
    printResponse(WindowListResponse(windows: []))
    exit(0)
  }

  var seenWindowIds = Set<CGWindowID>()
  var appIconCache = [pid_t: String]()
  let shouldFilterByAccessibility = canInspectAccessibilityWindows()
  let windows = windowList.compactMap { info -> RunningWindowResponse? in
    guard isListableWindow(info),
          let windowId = cgWindowId(info[kCGWindowNumber as String]),
          let processId = numberValue(info[kCGWindowOwnerPID as String])?.int32Value,
          let windowName = stringValue(info[kCGWindowName as String]),
          isActivatableApplication(processId: processId),
          !seenWindowIds.contains(windowId)
    else {
      return nil
    }

    let windowInfo = WindowInfo(id: windowId, processId: processId, title: windowName)
    if shouldFilterByAccessibility && findAXWindow(for: windowInfo) == nil {
      return nil
    }

    seenWindowIds.insert(windowId)
    let ownerName = stringValue(info[kCGWindowOwnerName as String])
    let appIcon = appIconCache[processId] ?? appIconDataURL(processId: processId)
    if let appIcon {
      appIconCache[processId] = appIcon
    }

    return RunningWindowResponse(
      id: "window:\(windowId):0",
      title: displayWindowTitle(ownerName: ownerName, windowName: windowName),
      appIcon: appIcon
    )
  }

  printResponse(WindowListResponse(windows: windows))
  exit(0)
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
if arguments.count == 1, arguments[0] == "list" {
  listWindows()
}

guard arguments.count == 2, arguments[0] == "activate" else {
  printResponse(
    ActivationResponse(
      activated: false,
      focused: false,
      status: "invalid-arguments",
      error: "Usage: WindowActivator list | activate <desktopCapturerSourceId>",
      windowId: nil,
      processId: nil,
      title: nil
    )
  )
  exit(64)
}

activateWindow(mediaSourceId: arguments[1])
