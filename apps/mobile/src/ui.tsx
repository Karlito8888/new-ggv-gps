import { useEffect, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { COPY, type IconName } from "@ggv/shared";
import { Icon } from "./Icon";
import { theme } from "./theme";

/**
 * A one-shot entrance, the web keyframes: `bottom` is `card-in`, `top` is `card-drop`, `flip` is
 * `sign-flip` (a sign swinging down from its top edge). Skipped when the OS asks for reduced
 * motion, like the web `prefers-reduced-motion` rule.
 */
function useEntrance(kind: "bottom" | "top" | "flip" | "none") {
  const [v] = useState(() => new Animated.Value(kind === "none" ? 1 : 0));
  useEffect(() => {
    if (kind === "none") return;
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!live) return;
      if (reduce) v.setValue(1);
      else
        Animated.timing(v, {
          toValue: 1,
          duration: kind === "flip" ? 700 : 560,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }).start();
    });
    return () => {
      live = false;
    };
  }, [v, kind]);
  if (kind === "none") return null;
  if (kind === "flip")
    return {
      opacity: v,
      transformOrigin: "top",
      transform: [
        { perspective: 600 },
        { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ["-70deg", "0deg"] }) },
      ],
    };
  const from = kind === "bottom" ? 48 : -48;
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
  };
}

/** The paper card of every overlay, the web `.modal`. */
export function Modal({
  children,
  style,
  enter = "bottom",
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  enter?: "bottom" | "top";
}) {
  const entrance = useEntrance(enter);
  return <Animated.View style={[styles.modal, entrance, style]}>{children}</Animated.View>;
}

/** A green street sign with its inset white rule: CTA, plates, turn sign. */
export function Sign({
  children,
  style,
  radius = theme.radiusSign,
  flip = false,
  compact = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  flip?: boolean;
  compact?: boolean;
}) {
  const entrance = useEntrance(flip ? "flip" : "none");
  const inset = compact ? 3 : 4;
  return (
    <Animated.View style={[styles.sign, { borderRadius: radius }, entrance, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.signRule,
          {
            top: inset,
            left: inset,
            right: inset,
            bottom: inset,
            borderRadius: radius - inset,
            borderWidth: compact ? 1.5 : 2,
          },
        ]}
      />
      {children}
    </Animated.View>
  );
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

/** The yellow road diamond on a card's top-right edge, the web `.overlay-icon-wrapper`. */
export function Diamond({ name, searching }: { name: IconName; searching?: boolean }) {
  return (
    <View style={styles.diamond}>
      {searching ? <SearchRing /> : null}
      <View style={styles.diamondRule} />
      <View style={styles.diamondIcon}>
        <Icon name={name} size={28} color={theme.text} />
      </View>
    </View>
  );
}

/** "GARDEN GROVE VILLAGE" after a sun dot, over every bottom card. */
export function Eyebrow() {
  return (
    <View style={styles.eyebrow}>
      <View style={styles.eyebrowDot} />
      <Text style={styles.eyebrowText}>{COPY.brand.village.en}</Text>
    </View>
  );
}

/** A heading with its Tagalog gloss underneath. */
export function Title({ en, tl, small }: { en: string; tl?: string; small?: boolean }) {
  return (
    <View>
      <Text style={[styles.title, small && styles.titleSmall]}>{en}</Text>
      {tl ? <Text style={styles.titleGloss}>{tl}</Text> : null}
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

/** Primary: a street sign, label left, icon trailing. Secondary: an outline, icon first. */
export function Button({
  label,
  onPress,
  disabled,
  secondary,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  if (secondary)
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.secondary,
          disabled && styles.disabled,
          pressed && styles.pressed,
          style,
        ]}
      >
        {icon ? <Icon name={icon} size={20} color={theme.text} /> : null}
        <Text style={styles.secondaryText}>{label}</Text>
      </Pressable>
    );
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryPress,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Sign style={[styles.primary, { justifyContent: icon ? "space-between" : "flex-start" }]}>
        <Text style={styles.primaryText}>{label}</Text>
        {icon ? <Icon name={icon} size={26} color={theme.onCta} /> : null}
      </Sign>
    </Pressable>
  );
}

/** An inline link: nest it in a `Text` so it flows with the sentence around it. */
export function Link({ label, url, style }: { label: string; url: string; style?: TextStyle }) {
  return (
    <Text
      accessibilityRole="link"
      style={[styles.link, style]}
      onPress={() => Linking.openURL(url)}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    paddingTop: 26,
    paddingHorizontal: 24,
    paddingBottom: 30,
    alignItems: "stretch",
    // A border, not an inset shadow: the web hairline ring.
    borderWidth: 1,
    borderColor: theme.hairline,
    boxShadow: theme.shadow.card,
  },
  sign: { backgroundColor: theme.cta, boxShadow: theme.shadow.sign },
  signRule: { position: "absolute", borderColor: theme.signRule },
  diamond: {
    position: "absolute",
    top: -30,
    right: 28,
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: theme.sun,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
    boxShadow: theme.shadow.diamond,
  },
  diamondRule: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.text,
  },
  diamondIcon: { transform: [{ rotate: "-45deg" }] },
  ring: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.text,
  },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 9 },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.sun,
    boxShadow: "0 0 0 3px rgba(243,197,73,0.3)",
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: theme.muted,
  },
  title: {
    marginTop: 16,
    fontFamily: theme.font,
    fontSize: 36,
    lineHeight: 37,
    letterSpacing: -0.5,
    color: theme.text,
    textAlign: "left",
  },
  titleSmall: { marginTop: 0, fontSize: 32, lineHeight: 33 },
  titleGloss: {
    marginTop: 6,
    fontFamily: theme.font,
    fontSize: 17,
    color: theme.primaryText,
  },
  body: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 24,
    color: theme.textMuted,
    textAlign: "left",
  },
  bodyGloss: { fontSize: 15, color: theme.primaryText },
  primaryPress: { alignSelf: "stretch", marginTop: 22 },
  primary: {
    minHeight: 64,
    paddingLeft: 24,
    paddingRight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryText: { flexShrink: 1, fontFamily: theme.font, fontSize: 20, color: theme.onCta },
  secondary: {
    alignSelf: "stretch",
    minHeight: 54,
    marginTop: 10,
    paddingHorizontal: 24,
    borderRadius: theme.radiusSign,
    borderWidth: 1.5,
    borderColor: theme.outline,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryText: { flexShrink: 1, fontFamily: theme.font, fontSize: 17, color: theme.text },
  disabled: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.97 }] },
  link: { color: theme.primaryText, textDecorationLine: "underline" },
});
