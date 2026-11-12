import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { COPY, inline, type IconName } from "@ggv/shared";
import { OSM_COPYRIGHT_URL, OSM_FIX_URL, PRIVACY_URL } from "./config";
import { Icon } from "./Icon";
import { theme } from "./theme";

/** The card of every overlay, the web `.modal`. */
export function Modal({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.modal, style]}>{children}</View>;
}

/** A 0 → 1 value that repeats for as long as the component is mounted. */
function useLoop(duration: number) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return value;
}

/** Turns its child continuously: the spinner of the web `.spin`. */
export function Spin({ children }: { children: ReactNode }) {
  const t = useLoop(800);
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

/** The dashed ring of the web `.is-searching`: "looking for your position". */
function SearchRing() {
  const t = useLoop(1600);
  const scale = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
  const opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.7, 0.35] });
  return <Animated.View style={[styles.ring, { opacity, transform: [{ scale }] }]} />;
}

/** The gradient disc at the top of a card, the web `.overlay-icon-wrapper`. */
export function IconDisc({
  name,
  gradient = "brand",
  searching,
}: {
  name: IconName;
  gradient?: keyof typeof theme.gradient;
  searching?: boolean;
}) {
  return (
    <View style={[styles.disc, { backgroundImage: theme.gradient[gradient] }]}>
      {searching ? <SearchRing /> : null}
      <Icon name={name} size={36} color="#ffffff" />
    </View>
  );
}

/** A heading with its Tagalog gloss underneath. */
export function Title({ en, tl }: { en: string; tl?: string }) {
  return (
    <View>
      <Text style={styles.title}>{en}</Text>
      {tl ? <Text style={styles.titleGloss}>({tl})</Text> : null}
    </View>
  );
}

/** A paragraph in English, its Tagalog gloss on the next line in brand-text colour. */
export function Body({ en, tl }: { en: string; tl?: string }) {
  return (
    <Text style={styles.body}>
      {en}
      {tl ? <Text style={styles.bodyGloss}>{`\n${tl}`}</Text> : null}
    </Text>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  secondary,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: IconName;
}) {
  const color = secondary ? theme.text : theme.onCta;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={color} /> : null}
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

/** Both stores require the privacy policy to be reachable from inside the app. */
export function PrivacyLink() {
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
      <Text style={styles.link}>{inline(COPY.gps.privacy)}</Text>
    </Pressable>
  );
}

/** OpenStreetMap credit and "fix the map": the FOSSGIS routing servers' usage terms. */
export function OsmCredit() {
  return (
    <View style={styles.credit}>
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(OSM_COPYRIGHT_URL)}
        hitSlop={8}
      >
        <Text style={[styles.creditText, styles.underline]}>{COPY.gps.osm.en}</Text>
      </Pressable>
      <Text style={styles.creditText}>·</Text>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(OSM_FIX_URL)} hitSlop={8}>
        <Text style={[styles.creditText, styles.underline]}>{COPY.gps.fixMap.en}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
    gap: 8,
    boxShadow: theme.shadow.card,
  },
  disc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    boxShadow: theme.shadow.disc,
  },
  ring: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 44,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#50aa61",
  },
  title: {
    fontFamily: theme.font,
    fontSize: 26,
    lineHeight: 29,
    letterSpacing: -0.26,
    color: theme.text,
    textAlign: "center",
  },
  titleGloss: {
    marginTop: 4,
    fontFamily: theme.font,
    fontSize: 16,
    color: theme.primaryText,
    textAlign: "center",
  },
  body: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    color: theme.textMuted,
    textAlign: "center",
  },
  bodyGloss: { fontSize: 15, color: theme.primaryText },
  button: {
    minHeight: 56,
    borderRadius: theme.radiusPill,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  buttonPrimary: { backgroundImage: theme.gradient.cta, boxShadow: theme.shadow.button },
  buttonSecondary: { minHeight: 44, backgroundColor: theme.textTint },
  buttonDisabled: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.97 }] },
  buttonText: {
    flexShrink: 1,
    fontFamily: theme.font,
    fontSize: 18,
    color: theme.onCta,
    textAlign: "center",
  },
  buttonTextSecondary: { fontSize: 16, color: theme.text },
  link: {
    fontSize: 13,
    color: theme.primaryText,
    textDecorationLine: "underline",
    marginTop: 8,
  },
  credit: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  creditText: { fontSize: 12, color: theme.gray },
  underline: { textDecorationLine: "underline" },
});
