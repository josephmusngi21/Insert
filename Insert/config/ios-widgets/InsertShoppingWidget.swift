import WidgetKit
import SwiftUI

struct ShoppingEntry: TimelineEntry {
    let date: Date
    let title: String
    let items: [String]
}

struct ShoppingProvider: TimelineProvider {
    func placeholder(in context: Context) -> ShoppingEntry {
        ShoppingEntry(date: Date(), title: "Shopping List", items: ["Milk", "Eggs", "Bread"])
    }

    func getSnapshot(in context: Context, completion: @escaping (ShoppingEntry) -> ()) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ShoppingEntry>) -> ()) {
        let entry = loadEntry()
        let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }

    private func loadEntry() -> ShoppingEntry {
        let sharedDefaults = UserDefaults(suiteName: "group.com.insert.app")
        let title = sharedDefaults?.string(forKey: "insert_widget_title") ?? "Shopping List"
        let items = sharedDefaults?.stringArray(forKey: "insert_widget_items") ?? []
        return ShoppingEntry(date: Date(), title: title, items: items)
    }
}

struct ShoppingWidgetView: View {
    var entry: ShoppingProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(entry.title)
                .font(.headline)

            if entry.items.isEmpty {
                Text("No pending items")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                ForEach(entry.items.prefix(4), id: \.self) { item in
                    Text("• \(item)")
                        .font(.caption)
                        .lineLimit(1)
                }
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct InsertShoppingWidget: Widget {
    let kind: String = "InsertShoppingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ShoppingProvider()) { entry in
            ShoppingWidgetView(entry: entry)
        }
        .configurationDisplayName("Insert Shopping")
        .description("Shows your current shopping list.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
