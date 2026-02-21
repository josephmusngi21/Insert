import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    searchContainer: {
        marginTop: 40,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    search: {
        marginTop: 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
    },

    row: {
        display: "flex",
        flexDirection: "row",
    },
    container: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: "#f8f9fa",
        width: "100%",
    },
    header: {
        backgroundColor: "#ffffff",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    titleAndMenu: {
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1a1a1a",
    },
    menu: {
        fontSize: 20,
        fontWeight: "600",
        color: "#666",
    },
    itemDetails: {
        backgroundColor: "#ffffff",
        marginHorizontal: 12,
        marginVertical: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    nameQuantity: {
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    itemType: {
        fontSize: 12,
        fontWeight: "500",
        color: "#888",
        marginBottom: 4,
    },
    itemName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1a1a1a",
        flex: 1,
    },
    itemQuantity: {
        fontSize: 14,
        fontWeight: "500",
        color: "#555",
        marginLeft: 12,
    },
    expirationLocation: {
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemExpiration1: {
        color: "#888",
        fontSize: 13,
        fontWeight: "400",
    },
    itemExpiration2: {
        color: "#dc3545",
        fontSize: 13,
        fontWeight: "700",
    },
    itemExpiration3: {
        color: "#ff9800",
        fontSize: 13,
        fontWeight: "600",
    },
    itemLocation: {
        fontSize: 13,
        fontWeight: "500",
        color: "#666",
        marginLeft: 12,
    },
    mainContainer: {
        paddingVertical: 12,
    },
});

export default styles;
