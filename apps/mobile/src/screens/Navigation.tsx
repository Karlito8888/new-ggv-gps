import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  COPY,
  currentTurn,
  formatDistance,
  remainingAlongRoute,
  turnLabel,
  type Destination,
  type RouteGeometry,
  type RouteSourceType,
  type RouteStep,
  type UserLocation,
} from "@ggv/shared";
import { theme } from "../theme";

/** The vibration fires once per turn, this close to it. */
const TURN_ALERT_M = 30;

export function Navigation({
  distanceRemaining,
  destination,
  steps,
  routeSource,
  routeGeoJSON,
  userLocation,
  isRecalculating,
  onCancel,
}: {
  distanceRemaining: number;
  destination: Destination | null;
  steps: RouteStep[];
  routeSource: RouteSourceType | null;
  routeGeoJSON: RouteGeometry | null;
  userLocation: UserLocation | null;
  isRecalculating: boolean;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const routeCoords = routeGeoJSON?.coordinates ?? null;
  const turn = currentTurn(steps, userLocation, routeCoords);
  const total = remainingAlongRoute(userLocation, destination, routeCoords, distanceRemaining);
  const label = turnLabel(turn);

  // Turn vibration: one heavy tap per turn, keyed by the turn's location.
  const alertedTurns = useRef(new Set<string>());
  const turnKey = turn?.location?.join();
  const distanceToTurn = turn?.distanceToStep;
  useEffect(() => {
    if (!turnKey || distanceToTurn === undefined || distanceToTurn > TURN_ALERT_M) return;
    if (alertedTurns.current.has(turnKey)) return;
    alertedTurns.current.add(turnKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [turnKey, distanceToTurn]);

  return (
    <>
      <View style={styles.top} accessibilityLabel={COPY.nav.infoAria.en}>
        <View style={styles.turn}>
          {isRecalculating ? (
            <>
              <Text style={styles.icon}>↻</Text>
              <Text style={styles.turnText}>
                {COPY.nav.recalculating.en}
                <Text style={styles.gloss}>{`\n(${COPY.nav.recalculating.tl})`}</Text>
              </Text>
            </>
          ) : turn ? (
            <>
              <Text style={styles.icon}>{turn.icon}</Text>
              <Text style={styles.turnText}>
                {label.en}
                <Text style={styles.gloss}>{`\n(${label.tl})`}</Text>
              </Text>
            </>
          ) : routeSource === "direct" ? (
            <Text style={styles.turnText}>
              {COPY.nav.headToward.en}
              <Text style={styles.gloss}>{`\n(${COPY.nav.headToward.tl})`}</Text>
            </Text>
          ) : (
            <Text style={styles.icon}>↑</Text>
          )}
        </View>
        <Text style={styles.dist}>
          {isRecalculating
            ? "..."
            : turn
              ? formatDistance(turn.distanceToStep)
              : formatDistance(distanceRemaining)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={COPY.nav.cancelAria.en}
          onPress={onCancel}
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>✕</Text>
        </Pressable>
      </View>

      <View
        style={[styles.bottom, { bottom: insets.bottom + 16 }]}
        accessibilityLabel={COPY.nav.destinationAria(destination?.name)}
      >
        <Text style={styles.destName}>📍 {destination?.name || COPY.nav.navigating.en}</Text>
        <Text style={styles.destDist}>{formatDistance(total)}</Text>
      </View>
    </>
  );
}

const pill = {
  position: "absolute" as const,
  left: 12,
  right: 12,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  backgroundColor: theme.glass,
  borderRadius: theme.radiusPill,
  paddingVertical: 10,
  paddingHorizontal: 16,
  gap: 12,
};

const styles = StyleSheet.create({
  // Below the logo, with a small margin.
  top: { ...pill, top: theme.logoTop + theme.logoHeight + 8, justifyContent: "space-between" },
  turn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { fontSize: 30, color: theme.primaryText },
  turnText: { flexShrink: 1, fontFamily: theme.font, fontSize: 16, color: theme.text },
  gloss: { fontSize: 12, color: theme.primaryText },
  dist: { fontFamily: theme.font, fontSize: 18, color: theme.text },
  cancel: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 18, color: theme.text },
  bottom: { ...pill, justifyContent: "space-between" },
  destName: { flex: 1, fontFamily: theme.font, fontSize: 16, color: theme.text },
  destDist: { fontFamily: theme.font, fontSize: 18, color: theme.primaryText },
});
