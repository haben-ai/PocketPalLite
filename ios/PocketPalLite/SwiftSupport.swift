import Foundation

// The app target itself has no other Swift source. Without at least one
// Swift file, Xcode links this target purely as Objective-C/C++, so the
// Swift-aware linker driver never runs and `libswiftCompatibility56.a`
// (which several Pods with Swift code, e.g. react-native-document-picker
// and react-native-pdf-page-image, pull in via
// `__swift_FORCE_LOAD_$_swiftCompatibility56`) never gets linked in,
// producing "symbol(s) not found for architecture arm64" at the final
// app link step.
@objc final class SwiftSupport: NSObject {}
