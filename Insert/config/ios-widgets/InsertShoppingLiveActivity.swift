import ActivityKit
import WidgetKit
import SwiftUI

struct InsertShoppingActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var storeName: String
        var summary: String
    }

    var title: String
}

struct InsertShoppingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: InsertShoppingActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 8) {
                Text(context.attributes.title)
                    .font(.headline)
                Text("Near: \(context.state.storeName)")
                    .font(.subheadline)
                Text(context.state.summary)
                    .font(.caption)
                    .lineLimit(2)
            }
            .padding(12)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.summary)
                        .font(.caption)
                }
            } compactLeading: {
                Text("Insert")
            } compactTrailing: {
                Text("Shop")
            } minimal: {
                Text("🛒")
            }
        }
    }
}
