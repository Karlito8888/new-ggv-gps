import { StyleSheet, View } from "react-native";
import { COPY } from "@ggv/shared";
import { theme } from "../theme";
import { Body, Modal, Title } from "../ui";

export function ExitComplete() {
  return (
    <View style={styles.overlay}>
      <Modal>
        <Title en={COPY.exit.title.en} tl={COPY.exit.title.tl} />
        <Body
          en={`${COPY.exit.exited.en}\n${COPY.exit.thanks.en}`}
          tl={`${COPY.exit.exited.tl}\n${COPY.exit.thanks.tl}`}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.overlay,
    justifyContent: "center",
    padding: 24,
  },
});
