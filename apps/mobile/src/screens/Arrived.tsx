import { StyleSheet, View } from "react-native";
import { COPY, inline, type Destination } from "@ggv/shared";
import { Body, Button, Modal, Title } from "../ui";

/** Floats over the live map, as on web: the map stays interactive underneath. */
export function Arrived({
  destination,
  onNavigateAgain,
  onExitVillage,
}: {
  destination: Destination | null;
  onNavigateAgain: () => void;
  onExitVillage: () => void;
}) {
  const name = destination?.name;
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Modal>
        <Title en={COPY.arrived.title.en} tl={COPY.arrived.title.tl} />
        <Body
          en={`${COPY.arrived.reached.en} ${name || COPY.arrived.yourDestination.en}.`}
          tl={`${COPY.arrived.reached.tl} ${name || COPY.arrived.yourDestination.tl}.`}
        />
      </Modal>
      <Modal>
        <Button label={inline(COPY.arrived.again)} onPress={onNavigateAgain} />
        <Button secondary label={inline(COPY.arrived.exit)} onPress={onExitVillage} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 80,
    paddingBottom: 40,
  },
});
