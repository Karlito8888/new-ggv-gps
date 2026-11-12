import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  COPY,
  OSM_COPYRIGHT_URL,
  OSM_FIX_URL,
  PRIVACY_URL,
  currentTurn,
  formatDistance,
  remainingAlongRoute,
  turnLabel,
  type Destination,
  type IconName,
  type RouteGeometry,
  type RouteSourceType,
  type RouteStep,
  type UserLocation,
  useCreditsBubble,
} from "@ggv/shared";
import { Icon } from "../Icon";
import { theme } from "../theme";
import { Link, Spin } from "../ui";

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
  gpsOn,
  onEnableGps,
}: {
  distanceRemaining: number;
  destination: Destination | null;
  steps: RouteStep[];
  routeSource: RouteSourceType | null;
  routeGeoJSON: RouteGeometry | null;
  userLocation: UserLocation | null;
  isRecalculating: boolean;
  onCancel: () => void;
  /** False when the user continued without GPS: the turn slot then offers to turn it on. */
  gpsOn: boolean;
  onEnableGps: () => void;
}) {
  const insets = useSafeAreaInsets();
  const credits = useCreditsBubble();
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

  // The web turn card, line for line: arrow tile, distance to the turn, instruction if any.
  const card: { icon: IconName; distance: string; text?: { en: string; tl: string } } = !gpsOn
    ? { icon: "gps", distance: "", text: COPY.nav.noLocation }
    : isRecalculating
      ? { icon: "spinner", distance: "…", text: COPY.nav.recalculating }
      : turn
        ? { icon: turn.icon, distance: formatDistance(turn.distanceToStep), text: label }
        : routeSource === "direct"
          ? {
              icon: "navigate",
              distance: formatDistance(distanceRemaining),
              text: COPY.nav.headToward,
            }
          : { icon: "straight", distance: formatDistance(distanceRemaining) };
  const arrow = <Icon name={card.icon} size={28} color={theme.onCta} />;

  return (
    <>
      <View style={styles.top} accessibilityLabel={COPY.nav.infoAria.en}>
        <Pressable
          style={styles.turn}
          disabled={gpsOn}
          onPress={onEnableGps}
          accessibilityRole={gpsOn ? undefined : "button"}
        >
          <View style={styles.tile}>{isRecalculating ? <Spin>{arrow}</Spin> : arrow}</View>
          <View style={styles.turnBody}>
            {userLocation ? <Text style={styles.dist}>{card.distance}</Text> : null}
            {card.text ? (
              <Text style={styles.turnText} numberOfLines={gpsOn ? 1 : undefined}>
                {card.text.en}
                <Text style={styles.gloss}> ({card.text.tl})</Text>
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={COPY.nav.cancelAria.en}
          onPress={onCancel}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Icon name="close" size={20} color={theme.text} />
        </Pressable>
      </View>

      {/* The strip and the credits bubble above it: one stack, so the bubble's links stay inside
          their parent's bounds, where Android delivers touches. */}
      <View style={[styles.bottomStack, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
        {credits.open ? (
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>
              <Link label={COPY.credits.osm.en} url={OSM_COPYRIGHT_URL} />
              {"  ·  "}
              <Link label={COPY.credits.fixMap.en} url={OSM_FIX_URL} />
              {credits.open === "manual" ? (
                <>
                  {"  ·  "}
                  <Link label={COPY.credits.privacy.en} url={PRIVACY_URL} />
                </>
              ) : null}
            </Text>
          </View>
        ) : null}
        <View
          style={styles.bottom}
          accessibilityLabel={COPY.nav.destinationAria(destination?.name)}
        >
          <Icon name="pin" size={20} color={theme.primaryText} />
          <Text style={styles.destName} numberOfLines={1}>
            {destination?.name || COPY.nav.navigating.en}
          </Text>
          {userLocation ? <Text style={styles.destDist}>{formatDistance(total)}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={COPY.credits.aria.en}
            onPress={credits.toggle}
            hitSlop={12}
          >
            <Icon name="info" size={20} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const pill = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  backgroundColor: theme.glass,
  boxShadow: theme.shadow.pill,
  padding: 12,
  gap: 12,
};

const styles = StyleSheet.create({
  // Below the logo, with a small margin.
  top: {
    ...pill,
    position: "absolute",
    left: 16,
    right: 16,
    top: theme.logoTop + theme.logoHeight + 8,
    borderRadius: theme.radiusCard,
  },
  turn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundImage: theme.gradient.cta,
  },
  turnBody: { flex: 1 },
  dist: { fontFamily: theme.font, fontSize: 24, lineHeight: 27, color: theme.primaryText },
  turnText: { fontSize: 15, fontWeight: "600", color: theme.text },
  gloss: { fontSize: 13, fontWeight: "400", color: theme.primaryText },
  cancel: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.textTint,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.97 }] },
  bottomStack: { position: "absolute", left: 16, right: 16, gap: 8 },
  bubble: {
    alignSelf: "flex-end",
    backgroundColor: theme.glass,
    boxShadow: theme.shadow.pill,
    borderRadius: theme.radiusPill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  bubbleText: { fontSize: 13, color: theme.textMuted },
  bottom: { ...pill, paddingHorizontal: 16, borderRadius: theme.radiusPill },
  destName: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.text },
  destDist: { fontFamily: theme.font, fontSize: 18, color: theme.primaryText },
});
