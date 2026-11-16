import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COPY, type Destination } from "@ggv/shared";
import { Icon } from "../Icon";
import { theme } from "../theme";
import { Button, Modal, Sign, Title } from "../ui";

/**
 * Floats over the live map, as on web: two cards, the centre left clear for the user and the
 * pin, and the map stays interactive underneath.
 */
export function Arrived({
  destination,
  onNavigateAgain,
  onExitVillage,
}: {
  destination: Destination | null;
  onNavigateAgain: () => void;
  onExitVillage: () => void;
}) {
  const insets = useSafeAreaInsets();
  const name = destination?.name;
  return (
    <View
      style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 10 }]}
      pointerEvents="box-none"
    >
      <Modal enter="top" style={styles.top}>
        <Title small en={COPY.arrived.title.en} tl={COPY.arrived.title.tl} />
        <Sign flip radius={20} style={styles.plate}>
          <View style={styles.plateBody}>
            <Text style={styles.caption}>{COPY.arrived.reached.en}</Text>
            <Text style={styles.name}>{name || COPY.arrived.yourDestination.en}</Text>
          </View>
          <View style={styles.check}>
            <Icon name="check" size={26} color={theme.text} />
          </View>
        </Sign>
        <Text style={styles.gloss}>
          {`${COPY.arrived.reached.tl} ${name || COPY.arrived.yourDestination.tl}.`}
        </Text>
      </Modal>
      <Modal style={styles.actions}>
        <Button
          icon="navigate"
          label={COPY.arrived.again.en}
          onPress={onNavigateAgain}
          style={styles.firstButton}
        />
        <Button icon="exit" secondary label={COPY.arrived.exit.en} onPress={onExitVillage} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  top: { paddingTop: 22, paddingHorizontal: 22, paddingBottom: 18 },
  plate: {
    marginTop: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  plateBody: { flex: 1 },
  caption: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.82)",
  },
  name: { marginTop: 8, fontFamily: theme.font, fontSize: 34, lineHeight: 34, color: theme.onCta },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.sun,
    alignItems: "center",
    justifyContent: "center",
  },
  gloss: { marginTop: 10, fontSize: 15, lineHeight: 21, color: theme.primaryText },
  // `.arrived-bottom-modal`: the buttons sit closer to the card edge.
  actions: { padding: 12, paddingBottom: 24 },
  firstButton: { marginTop: 0 },
});
