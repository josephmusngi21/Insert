import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  row: {
    display: "flex",
    flexDirection: "row",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  header: {},
  titleAndFilter: {},
  title: {},
  filter: {},
  itemDetails: {
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    paddingHorizontal: 50,
    paddingVertical: 10,
    borderColor: "black",
    borderWidth: 1,
    borderRadius: 13,
  },
  nameQuantity: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  itemName: {},
  itemQuantity: {},
  expirationLocation: {},
  itemExpiration1: {
    // Expiration more than 4 days away
    color: 'grey',
    fontSize: 14,
    fontWeight: '400',
  },
  itemExpiration2: {
    // Expiring today
    color: "red",
    fontSize: 12,
    fontWeight: '700',

  },
  itemExpiration3: {
    // Expiring in less than 4 days
    fontWeight: '500',
    fontSize: 14,
    color: "orange",
  },
  itemLocation: {},
  mainContainer: {},
});

export default styles;
