import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "./theme";

/** A white rounded card, the shape of every web `.modal`. */
export function Modal({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.modal, style]}>{children}</View>;
}

/** A heading with its Tagalog gloss underneath. */
export function Title({ en, tl }: { en: string; tl?: string }) {
  return (
    <>
      <Text style={styles.title}>{en}</Text>
      {tl ? <Text style={styles.titleGloss}>({tl})</Text> : null}
    </>
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
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusModal,
    padding: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { fontFamily: theme.font, fontSize: 24, color: theme.text, textAlign: "center" },
  titleGloss: {
    fontFamily: theme.font,
    fontSize: 14,
    color: theme.gray,
    textAlign: "center",
  },
  body: { fontFamily: theme.font, fontSize: 15, color: theme.text, textAlign: "center" },
  bodyGloss: { color: theme.primaryText },
  button: {
    minHeight: 56,
    borderRadius: theme.radiusModal,
    paddingHorizontal: 20,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonPrimary: { backgroundColor: theme.cta },
  buttonSecondary: { backgroundColor: "#fff", borderWidth: 2, borderColor: theme.cta },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontFamily: theme.font, fontSize: 17, color: theme.onCta, textAlign: "center" },
  buttonTextSecondary: { color: theme.primaryText },
});
