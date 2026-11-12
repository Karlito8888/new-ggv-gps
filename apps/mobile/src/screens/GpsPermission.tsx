import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COPY, inline } from "@ggv/shared";
import type { LocationStatus } from "../useDeviceLocation";
import { theme } from "../theme";
import { Body, Button, IconDisc, Modal, PrivacyLink, Title } from "../ui";

/** `onContinue` leaves for Welcome, with the location granted or without it. */
export function GpsPermission({
  isMapReady,
  start,
  onContinue,
}: {
  isMapReady: boolean;
  start: () => Promise<LocationStatus>;
  onContinue: () => void;
}) {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const insets = useSafeAreaInsets();

  const enable = async () => {
    setStatus("requesting");
    const result = await start();
    setStatus(result);
    if (result === "granted") onContinue();
  };

  // Both statuses are fixed only in the system Settings.
  const toSettings = status === "blocked" || status === "approximate";
  const label = !isMapReady
    ? inline(COPY.gps.wait)
    : status === "requesting"
      ? inline(COPY.gps.requesting)
      : toSettings
        ? inline(COPY.gps.openSettings)
        : inline(COPY.gps.enable);

  return (
    // The longest card (store disclosures, refusal buttons): it stays below the logo and scrolls
    // on a short screen instead of running off it.
    <ScrollView
      style={styles.overlay}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
    >
      <Modal style={styles.modal}>
        <IconDisc name="gps" searching={status === "requesting"} />
        <Title en={COPY.gps.title.en} tl={COPY.gps.title.tl} />
        <Body en={COPY.gps.description.en} tl={COPY.gps.description.tl} />
        <Body en={COPY.gps.routing.en} tl={COPY.gps.routing.tl} />
        {status === "approximate" ? (
          <Text style={styles.error}>{inline(COPY.gps.precise)}</Text>
        ) : status === "denied" || status === "blocked" ? (
          <Text style={styles.error}>{inline(COPY.gps.retry)}</Text>
        ) : null}
        <Button
          label={label}
          disabled={!isMapReady || status === "requesting"}
          // Back from Settings, the next tap must ask again: neither status is terminal.
          onPress={
            toSettings
              ? () => {
                  setStatus("idle");
                  Linking.openSettings();
                }
              : enable
          }
        />
        {/* Apple 5.1.1(iv): an alternative for whoever refuses or keeps location approximate. */}
        {toSettings || status === "denied" ? (
          <Button label={inline(COPY.gps.skip)} secondary onPress={onContinue} />
        ) : null}
        <PrivacyLink />
        <Text style={styles.version}>v{Constants.expoConfig?.version}</Text>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: theme.logoTop + theme.logoHeight + 8,
    paddingHorizontal: 16,
  },
  modal: { alignSelf: "stretch" },
  error: { marginTop: 8, fontSize: 14, color: theme.text, textAlign: "center" },
  version: { fontSize: 12, color: theme.gray },
});
