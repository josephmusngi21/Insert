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
  titleAndFilter: {
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    paddingHorizontal: 50,
    paddingVertical: 10,
    borderColor: "black",
    borderWidth: 1,
  },
  title: {},
  filter: {},
  itemDetails: {},
  nameQuantity: {},
  itemName: {},
  itemQuantity: {},
  expirationLocation: {},
  itemExpiration: {},
  itemLocation: {},
  mainContainer: {},
});

export default styles;
