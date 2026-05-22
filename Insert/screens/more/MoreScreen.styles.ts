import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  /* User card */
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userNameLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  userEmailText: {
    fontSize: 13,
  },
  notificationsWrap: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  notificationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  notificationsTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  notificationsBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#d86f21",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  notificationsBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  notificationsMarkRead: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: "700",
  },
  notificationsExpandButton: {
    marginTop: 2,
    marginBottom: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  notificationsExpandButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  notificationsUnreadList: {
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  notificationsRecentLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  notificationsItem: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  notificationsEmpty: {
    fontSize: 11,
    lineHeight: 16,
  },
  adminSwitcherWrap: {
    marginTop: 12,
  },
  adminSwitcherTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  adminSwitcherHint: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  adminSwitcherButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  adminSwitchButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  adminSwitchButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },

  /* Section */
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#B27A4D",
    marginBottom: 8,
    marginLeft: 6,
  },
  sectionCard: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },

  /* Row */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowIcon: {
    fontSize: 20,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 24,
    fontWeight: "300",
    marginLeft: 6,
  },
  soonBadge: {
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  soonText: {
    fontSize: 11,
    color: "#c0c0c0",
    fontWeight: "600",
  },

  /* Sign out */
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff2f2",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#f5cccc",
    gap: 10,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    color: "#d32f2f",
    fontSize: 16,
    fontWeight: "700",
  },
});
