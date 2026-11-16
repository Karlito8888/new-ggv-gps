import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../Icon";
import { theme } from "../theme";
import { Sign } from "../ui";

/** Room under the plate for the sign shadow (`0 10px 22px -10px`), inside the native host. */
export const SHADOW_ROOM = 14;

export type SelectOption = { label: string; value: string };

export type SelectProps = {
  /** The small label on the plate: "Block", "Lot". */
  caption: string;
  value: string;
  /** Shown on the empty plate; never an option, like the web `<option value="">`. */
  placeholder: { en: string; tl: string };
  options: SelectOption[];
  onChange: (value: string) => void;
  enabled: boolean;
};

/**
 * The closed field, the web `.welcome-plate` (apps/web/src/styles/app.css): dashed while empty, a
 * green street sign once chosen. The native menu it opens is platform code in
 * `Select.android.tsx` / `Select.ios.tsx`.
 */
export function SelectField({
  caption,
  value,
  placeholder,
  enabled,
  onPress,
}: {
  caption: string;
  value: string;
  placeholder: SelectProps["placeholder"];
  enabled: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="combobox"
      accessibilityLabel={`${caption} ${value || placeholder.en}`}
      style={[styles.field, !enabled && styles.disabled]}
    >
      {value ? (
        // Keyed on the value: a new choice flips the sign down again.
        <Sign key={value} flip style={styles.plate}>
          <Text style={[styles.caption, styles.captionOnSign]}>{caption}</Text>
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
          <View style={styles.chevron}>
            <Icon name="chevron" size={16} color="rgba(255,255,255,0.75)" />
          </View>
        </Sign>
      ) : (
        <View style={[styles.plate, styles.empty]}>
          <Text style={styles.caption}>{caption}</Text>
          <Text style={styles.placeholder}>
            {placeholder.en}
            <Text style={styles.gloss}>{`\n(${placeholder.tl})`}</Text>
          </Text>
          <View style={styles.chevron}>
            <Icon name="chevron" size={16} color={theme.muted} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The native menu host clips at its bounds: the room below lets the sign's shadow fade out
  // instead of ending on a hard edge. Welcome takes it back with a negative margin.
  field: { width: "100%", minHeight: 98 + SHADOW_ROOM, paddingBottom: SHADOW_ROOM },
  disabled: { opacity: 0.6 },
  plate: { flexGrow: 1, padding: 16 },
  empty: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.dashed,
    borderRadius: theme.radiusSign,
  },
  caption: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: theme.muted,
  },
  captionOnSign: { color: "rgba(255,255,255,0.82)" },
  value: {
    marginTop: 10,
    fontFamily: theme.font,
    fontSize: 46,
    lineHeight: 44,
    color: theme.onCta,
  },
  placeholder: { marginTop: 10, fontSize: 14, lineHeight: 18, color: theme.text },
  gloss: { color: theme.primaryText },
  chevron: { position: "absolute", top: 14, right: 14 },
});
