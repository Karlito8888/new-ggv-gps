import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  COPY,
  inline,
  OSM_COPYRIGHT_URL,
  PRIVACY_URL,
  useDestinationChoice,
  type Destination,
} from "@ggv/shared";
import { Select } from "../select/Select";
import { SHADOW_ROOM } from "../select/SelectField";
import { theme } from "../theme";
import { Button, Eyebrow, Link, Modal, Title } from "../ui";
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
  const insets = useSafeAreaInsets();

  // Same two plates as the web WelcomeOverlay: the lot plate only exists once a block is
  // chosen, and its placeholder text and disabled conditions match the web line for line.
  const lotPlaceholder = isLoadingLots
    ? COPY.welcome.loading
    : lotList.length === 0
      ? COPY.welcome.noLots
      : COPY.welcome.selectLot;

  return (
    <View style={[styles.overlay, { paddingBottom: insets.bottom + 10 }]}>
      {/* The map shows behind the card: its credit, just above the card (OSMF guideline). */}
      <View style={styles.mapCredit}>
        <Text>
          <Link label={COPY.credits.osm.en} url={OSM_COPYRIGHT_URL} style={styles.mapCreditLink} />
        </Text>
      </View>

      <Modal>
        <Eyebrow />
        <Title en={COPY.welcome.title.en} tl={COPY.welcome.title.tl} />

        <View style={styles.plates}>
          <View style={styles.plate}>
            <Select
              caption={COPY.welcome.plateBlock.en}
              value={selectedBlock}
              placeholder={COPY.welcome.selectBlock}
              options={blocks.map((block) => ({ label: COPY.welcome.block(block), value: block }))}
              onChange={setBlock}
              enabled
            />
          </View>
          {selectedBlock ? (
            <View style={styles.plate}>
              <Select
                caption={COPY.welcome.plateLot.en}
                value={effectiveLot}
                placeholder={lotPlaceholder}
                options={lotList.map((l) => ({ label: COPY.welcome.lot(l.lot), value: l.lot }))}
                onChange={setLot}
                enabled={!isLoadingLots && lotList.length > 0}
              />
            </View>
          ) : null}
        </View>

        <Button
          icon="navigate"
          label={COPY.welcome.navigate.en}
          disabled={!selectedBlock || !effectiveLot}
          onPress={navigate}
        />
        {/* Navigate is the tap that sends the position out: say where, at that very spot. */}
        <Text style={styles.note}>
          {COPY.welcome.routing.en}
          <Text style={styles.gloss}>{`\n${COPY.welcome.routing.tl}\n`}</Text>
          <Link label={inline(COPY.credits.privacy)} url={PRIVACY_URL} style={styles.noteLink} />
        </Text>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundImage: theme.fade,
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingTop: theme.logoTop + theme.logoHeight + 12,
  },
  // `.welcome-plates`: one plate is full width, two share the row.
  plates: { flexDirection: "row", gap: 10, marginTop: 20, marginBottom: -SHADOW_ROOM },
  plate: { flex: 1 },
  // `.route-note`
  note: { marginTop: 14, fontSize: 12.5, lineHeight: 18, color: theme.muted, textAlign: "center" },
  noteLink: { fontWeight: "600" },
  gloss: { color: theme.primaryText },
  // `.map-credit`: ink on its own paper chip, so its contrast does not depend on the map.
  mapCredit: {
    alignSelf: "flex-end",
    marginBottom: 8,
    marginRight: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: theme.radiusPill,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.hairline,
    boxShadow: theme.shadow.chip,
  },
  mapCreditLink: { fontSize: 11, fontWeight: "600", color: theme.text },
});
