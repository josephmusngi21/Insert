import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: 0.2,
  },

  /* User card */
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
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

  /* Section */
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#8fa892",
    marginBottom: 8,
    marginLeft: 6,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Row */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
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
    fontSize: 15,
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
    borderRadius: 12,
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
