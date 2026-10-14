import { Button, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import { SelectField, type SelectProps } from "./SelectField";

/** The web `<select>`: our field as the label, a SwiftUI menu behind it. */
export function Select({ value, placeholder, options, onChange, enabled }: SelectProps) {
  const label = options.find((o) => o.value === value)?.label ?? placeholder;
  return (
    <Host matchContents={{ vertical: true }} style={styles.host}>
      <Menu
        label={
          // Width from the host, height from the field.
          <RNHostView matchContents={{ vertical: true }}>
            <SelectField label={label} enabled={enabled} />
          </RNHostView>
        }
      >
        {options.map((o) => (
          <Button key={o.value} label={o.label} onPress={() => onChange(o.value)} />
        ))}
      </Menu>
    </Host>
  );
}

const styles = { host: { width: "100%" as const } };
