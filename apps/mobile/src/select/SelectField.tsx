import { Pressable, StyleSheet, Text } from "react-native";
import { Icon } from "../Icon";
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
      <Icon name="chevron" size={16} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(18, 18, 18, 0.15)",
    borderRadius: theme.radiusField,
    backgroundColor: theme.surface,
  },
  disabled: { opacity: 0.6 },
  label: { flexShrink: 1, fontSize: 16, color: theme.text },
});
