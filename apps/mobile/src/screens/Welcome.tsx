import { StyleSheet, View } from "react-native";
import { COPY, inline, useDestinationChoice, type Destination } from "@ggv/shared";
import { Select } from "../select/Select";
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

  // Same two selects as the web WelcomeOverlay: the lot select only exists once a block is
  // chosen, and its placeholder text and disabled conditions match the web line for line.
  const lotPlaceholder = isLoadingLots
    ? COPY.welcome.loading
    : lotList.length === 0
      ? COPY.welcome.noLots
      : COPY.welcome.selectLot;

  return (
    <View style={styles.overlay}>
      <Modal style={styles.modal}>
        <Title en={COPY.welcome.title.en} tl={COPY.welcome.title.tl} />

        <View style={styles.selector}>
          <Select
            value={selectedBlock}
            placeholder={inline(COPY.welcome.selectBlock)}
            options={blocks.map((block) => ({ label: COPY.welcome.block(block), value: block }))}
            onChange={setBlock}
            enabled
          />
        </View>

        {selectedBlock ? (
          <View style={styles.selector}>
            <Select
              value={effectiveLot}
              placeholder={inline(lotPlaceholder)}
              options={lotList.map((l) => ({ label: COPY.welcome.lot(l.lot), value: l.lot }))}
              onChange={setLot}
              enabled={!isLoadingLots && lotList.length > 0}
            />
          </View>
        ) : null}

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
  // `.welcome-block-selector { margin-bottom: var(--ggv-space-lg) }`
  selector: { alignSelf: "stretch", marginBottom: 24 },
});
