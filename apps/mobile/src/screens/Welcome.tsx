import { StyleSheet, View } from "react-native";
import { Host, Picker } from "@expo/ui";
import { COPY, inline, useDestinationChoice, type Destination } from "@ggv/shared";
import { theme } from "../theme";
import { Button, Modal, Title } from "../ui";
import { villageSnapshot } from "../villageSnapshot";

/** `blocks` is the live Convex list, or the bundled snapshot while it has not answered. */
export function Welcome({
  blocks,
  onSelectDestination,
}: {
  blocks: string[];
  onSelectDestination: (d: Destination) => void;
}) {
  // The snapshot always answers, so there is no offline message here.
  const { selectedBlock, setBlock, effectiveLot, setLot, lotList, isLoadingLots, navigate } =
    useDestinationChoice(onSelectDestination, villageSnapshot.lotsByBlock);

  // Same two selects as the web WelcomeOverlay: the empty item is the placeholder, and its label
  // carries the state (loading, no lots) the way the web `<option value="">` does.
  const lotPlaceholder = isLoadingLots
    ? COPY.welcome.loading
    : !selectedBlock
      ? COPY.welcome.selectBlockFirst
      : lotList.length === 0
        ? COPY.welcome.noLots
        : COPY.welcome.selectLot;

  return (
    <View style={styles.overlay}>
      <Modal style={styles.modal}>
        <Title en={COPY.welcome.title.en} tl={COPY.welcome.title.tl} />

        <Host {...host}>
          <Picker selectedValue={selectedBlock} onValueChange={setBlock}>
            <Picker.Item label={inline(COPY.welcome.selectBlock)} value="" />
            {blocks.map((block) => (
              <Picker.Item key={block} label={COPY.welcome.block(block)} value={block} />
            ))}
          </Picker>
        </Host>

        <Host {...host}>
          <Picker
            selectedValue={effectiveLot}
            onValueChange={setLot}
            enabled={!!selectedBlock && !isLoadingLots && lotList.length > 0}
          >
            <Picker.Item label={inline(lotPlaceholder)} value="" />
            {lotList.map((l) => (
              <Picker.Item key={l.lot} label={COPY.welcome.lot(l.lot)} value={l.lot} />
            ))}
          </Picker>
        </Host>

        <Button
          label={inline(COPY.welcome.navigate)}
          disabled={!selectedBlock || !effectiveLot}
          onPress={navigate}
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
    padding: 16,
  },
  modal: { alignSelf: "stretch" },
  picker: { width: "100%" },
});

// The app is light-only (`userInterfaceStyle`), but a Compose host follows the device scheme
// unless told otherwise; the seed colour derives the Material palette from the CTA green.
const host = {
  matchContents: { vertical: true },
  colorScheme: "light",
  seedColor: theme.cta,
  style: styles.picker,
} as const;
