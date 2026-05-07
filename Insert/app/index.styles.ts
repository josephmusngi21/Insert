import { StyleSheet } from "react-native";

export default StyleSheet.create({
  blankScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  blankText: {
    fontSize: 24,
    color: '#999',
  },
  bottomTabContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIcon: {
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  tabIconPill: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
  },
  iconText: {
    // kept for compatibility
  },
  iconTextActive: {
    // kept for compatibility
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontWeight: "700",
  },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButtonIcon: {
    fontSize: 36,
    fontWeight: "700",
  },
});
