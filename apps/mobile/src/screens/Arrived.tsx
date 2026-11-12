import { StyleSheet, View } from "react-native";
import { COPY, inline, type Destination } from "@ggv/shared";
import { Body, Button, IconDisc, Modal, Title } from "../ui";

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
        <IconDisc name="arrived" gradient="success" />
        <Title en={COPY.arrived.title.en} tl={COPY.arrived.title.tl} />
        <Body
          en={`${COPY.arrived.reached.en} ${name || COPY.arrived.yourDestination.en}.`}
          tl={`${COPY.arrived.reached.tl} ${name || COPY.arrived.yourDestination.tl}.`}
        />
      </Modal>
      <Modal style={styles.actions}>
        <Button
          icon="navigate"
          label={`${COPY.arrived.again.en}\n(${COPY.arrived.again.tl})`}
          onPress={onNavigateAgain}
        />
        <Button icon="exit" secondary label={inline(COPY.arrived.exit)} onPress={onExitVillage} />
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
  // `.arrived-bottom-modal`: the buttons sit closer to the card edge.
  actions: { padding: 16, paddingTop: 8 },
});
