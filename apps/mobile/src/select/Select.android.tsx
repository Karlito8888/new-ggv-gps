import { useState } from "react";
import { View } from "react-native";
import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  RNHostView,
  Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import { SelectField, type SelectProps } from "./SelectField";
import { theme } from "../theme";

/** The web `<select>`: our field as the trigger, a Material 3 dropdown as the menu. */
export function Select({ value, placeholder, options, onChange, enabled }: SelectProps) {
  const [open, setOpen] = useState(false);
  // `RNHostView` sizes the field on its content: hand it the host width instead.
  const [width, setWidth] = useState<number>();
  const label = options.find((o) => o.value === value)?.label ?? placeholder;
  return (
    <View style={styles.host} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* The app is light-only; a Compose host follows the device scheme unless told otherwise. */}
      <Host matchContents colorScheme="light" seedColor={theme.cta}>
        <DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)}>
          <DropdownMenu.Trigger>
            <RNHostView matchContents>
              <SelectField
                label={label}
                enabled={enabled}
                width={width}
                onPress={() => setOpen(true)}
              />
            </RNHostView>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {options.map((o) => (
              <DropdownMenuItem
                key={o.value}
                onClick={() => {
                  setOpen(false);
                  onChange(o.value);
                }}
              >
                <DropdownMenuItem.Text>
                  <ComposeText>{o.label}</ComposeText>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            ))}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    </View>
  );
}

const styles = { host: { width: "100%" as const } };
