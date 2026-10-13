import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { COPY, inline } from "@ggv/shared";
import type { LocationStatus } from "../useDeviceLocation";
import { theme } from "../theme";
import { Body, Button, Modal, Title } from "../ui";

export function GpsPermission({
  isMapReady,
  start,
  onGrant,
}: {
  isMapReady: boolean;
  start: () => Promise<LocationStatus>;
  onGrant: () => void;
}) {
  const [status, setStatus] = useState<LocationStatus>("idle");

  const enable = async () => {
    setStatus("requesting");
    const result = await start();
    setStatus(result);
    if (result === "granted") onGrant();
  };

  const blocked = status === "blocked";
  const label = !isMapReady
    ? inline(COPY.gps.wait)
    : status === "requesting"
      ? inline(COPY.gps.requesting)
      : blocked
        ? inline(COPY.gps.openSettings)
        : inline(COPY.gps.enable);

  return (
    <View style={styles.overlay}>
      <Modal style={styles.modal}>
        <Title en={COPY.gps.title.en} tl={COPY.gps.title.tl} />
        <Body en={COPY.gps.description.en} tl={COPY.gps.description.tl} />
        {status === "denied" || blocked ? (
          <Text style={styles.error}>{inline(COPY.gps.retry)}</Text>
        ) : null}
        <Button
          label={label}
          disabled={!isMapReady || status === "requesting"}
          onPress={blocked ? () => Linking.openSettings() : enable}
        />
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
  version: { fontFamily: theme.font, fontSize: 12, color: theme.gray, marginTop: 8 },
});
