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
import { theme } from "../theme";
import { Button, IconDisc, Link, Modal, Title } from "../ui";
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
        <IconDisc name="pin" />
        <Title en={COPY.welcome.title.en} tl={COPY.welcome.title.tl} />

        <View style={[styles.selector, styles.firstSelector]}>
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
          icon="navigate"
          label={inline(COPY.welcome.navigate)}
          disabled={!selectedBlock || !effectiveLot}
          onPress={navigate}
        />
        {/* Navigate is the tap that sends the position out: say where, at that very spot. */}
        <Text style={styles.note}>
          {COPY.welcome.routing.en}
          <Text style={styles.gloss}>{`\n${COPY.welcome.routing.tl}\n`}</Text>
          <Link label={inline(COPY.credits.privacy)} url={PRIVACY_URL} />
        </Text>
      </Modal>

      {/* The map shows dimmed behind the card: its credit, in the corner (OSMF guideline). */}
      <Text style={[styles.mapCredit, { bottom: insets.bottom + 16 }]}>
        <Link label={COPY.credits.osm.en} url={OSM_COPYRIGHT_URL} style={styles.mapCreditLink} />
      </Text>
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
  // `.welcome-block-selector`: 16 above the first field, 8 between fields (with the card's gap).
  selector: { alignSelf: "stretch" },
  firstSelector: { marginTop: 8 },
  // `.route-note`
  note: { marginTop: 8, fontSize: 13, lineHeight: 19, color: theme.textMuted, textAlign: "center" },
  gloss: { color: theme.primaryText },
  // `.map-credit`: white at 90 % over the dimmed map (5.10:1 measured on the web backdrop).
  mapCredit: { position: "absolute", right: 16, fontSize: 12 },
  mapCreditLink: { color: "rgba(255,255,255,0.9)" },
});
