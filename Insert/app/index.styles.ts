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
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  tabIcon: {
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  iconText: {
    fontSize: 24,
    marginBottom: 2,
    fontWeight: "500",
  },
  iconTextActive: {
    fontSize: 26,
    fontWeight: "700",
  },
  tabLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#4CAF50",
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
