import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { COPY, inline, useDestinationChoice, type Destination } from "@ggv/shared";
import { theme } from "../theme";
import { Body, Button, Modal, Title } from "../ui";
import { villageSnapshot } from "../villageSnapshot";

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

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

  return (
    <View style={styles.overlay}>
      <Modal style={styles.modal}>
        <Title en={COPY.welcome.title.en} tl={COPY.welcome.title.tl} />

        <Body en={COPY.welcome.selectBlock.en} tl={COPY.welcome.selectBlock.tl} />
        <FlatList
          style={styles.grid}
          data={blocks}
          numColumns={5}
          keyExtractor={(b) => b}
          renderItem={({ item }) => (
            <Chip label={item} selected={item === selectedBlock} onPress={() => setBlock(item)} />
          )}
        />

        {selectedBlock ? (
          <>
            <Body en={COPY.welcome.selectLot.en} tl={COPY.welcome.selectLot.tl} />
            {isLoadingLots ? (
              <Body en={COPY.welcome.loading.en} tl={COPY.welcome.loading.tl} />
            ) : lotList.length === 0 ? (
              <Body en={COPY.welcome.noLots.en} tl={COPY.welcome.noLots.tl} />
            ) : (
              <FlatList
                style={styles.grid}
                data={lotList}
                numColumns={5}
                keyExtractor={(l) => l.lot}
                renderItem={({ item }) => (
                  <Chip
                    label={item.lot}
                    selected={item.lot === effectiveLot}
                    onPress={() => setLot(item.lot)}
                  />
                )}
              />
            )}
          </>
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
  modal: { alignSelf: "stretch", maxHeight: "90%" },
  grid: { alignSelf: "stretch", flexGrow: 0, maxHeight: 180 },
  chip: {
    flex: 1,
    margin: 3,
    minHeight: 44,
    maxWidth: "20%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cta,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: { backgroundColor: theme.cta },
  chipText: { fontFamily: theme.font, fontSize: 15, color: theme.primaryText },
  chipTextSelected: { color: theme.onCta },
});
