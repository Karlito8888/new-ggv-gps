import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

export type SelectOption = { label: string; value: string };

export type SelectProps = {
  value: string;
  /** Shown in the field while `value` is empty; never an option, like the web `<option value="">`. */
  placeholder: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  enabled: boolean;
};

/**
 * The closed field, token for token the web `.welcome-select` (apps/web/src/styles/app.css): the
 * native menu it opens is platform code in `Select.android.tsx` / `Select.ios.tsx`.
 */
export function SelectField({
  label,
  enabled,
  onPress,
}: {
  label: string;
  enabled: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="combobox"
      style={[styles.field, !enabled && styles.disabled]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "rgba(18, 18, 18, 0.15)",
    borderRadius: 12,
    backgroundColor: theme.surface,
  },
  disabled: { opacity: 0.6 },
  label: { flexShrink: 1, fontFamily: theme.font, fontSize: 16, color: theme.text },
  // The web chevron is a 16 px stroked polyline; two borders of a rotated square draw the same.
  chevron: {
    width: 9,
    height: 9,
    marginTop: -5,
    marginLeft: 12,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.text,
    transform: [{ rotate: "45deg" }],
  },
});
