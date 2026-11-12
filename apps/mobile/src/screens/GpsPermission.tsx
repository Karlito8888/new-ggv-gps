import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { COPY, inline } from "@ggv/shared";
import type { LocationStatus } from "../useDeviceLocation";
import { theme } from "../theme";
import { Body, Button, Modal, PrivacyLink, Title } from "../ui";

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
    <View style={styles.overlay}>
      <Modal style={styles.modal}>
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
  modal: { alignSelf: "stretch" },
  error: { fontFamily: theme.font, color: theme.error, textAlign: "center" },
  version: { fontFamily: theme.font, fontSize: 12, color: theme.gray },
});
