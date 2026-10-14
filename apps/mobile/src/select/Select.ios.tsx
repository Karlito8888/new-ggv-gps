import { useState } from "react";
import { View } from "react-native";
import { Button, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import { SelectField, type SelectProps } from "./SelectField";

/** The web `<select>`: our field as the label, a SwiftUI menu behind it. */
export function Select({ value, placeholder, options, onChange, enabled }: SelectProps) {
  // `RNHostView` sizes the field on its content: hand it the host width instead.
  const [width, setWidth] = useState<number>();
  const label = options.find((o) => o.value === value)?.label ?? placeholder;
  return (
    <View style={styles.host} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Host matchContents>
        <Menu
          label={
            <RNHostView matchContents>
              <SelectField label={label} enabled={enabled} width={width} />
            </RNHostView>
          }
        >
          {options.map((o) => (
            <Button key={o.value} label={o.label} onPress={() => onChange(o.value)} />
          ))}
        </Menu>
      </Host>
    </View>
  );
}

const styles = { host: { width: "100%" as const } };
