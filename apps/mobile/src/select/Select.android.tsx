import { useState } from "react";
import { View } from "react-native";
import {
  Column,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  RNHostView,
  Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import {
  fillMaxWidth,
  height,
  verticalScroll,
  width as composeWidth,
} from "@expo/ui/jetpack-compose/modifiers";
import { SelectField, type SelectProps } from "./SelectField";
import { theme } from "../theme";

/** Four rows and the top of a fifth (dp): fits under either field, and the cut row says "scroll". */
const MENU_HEIGHT = 200;

/** The web `<select>`: our field as the trigger, a Material 3 dropdown as the menu. */
export function Select({ value, placeholder, options, onChange, enabled }: SelectProps) {
  const [open, setOpen] = useState(false);
  // The popup is a separate window: it cannot fill the field, so it gets the field's width.
  const [width, setWidth] = useState(0);
  const label = options.find((o) => o.value === value)?.label ?? placeholder;
  return (
    <View style={styles.host} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* The app is light-only; a Compose host follows the device scheme unless told otherwise. */}
      <Host matchContents={{ vertical: true }} colorScheme="light" seedColor={theme.cta}>
        <DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)} color={theme.surface}>
          <DropdownMenu.Trigger>
            {/* Width from the host, height from the field. */}
            <RNHostView matchContents={{ vertical: true }} modifiers={[fillMaxWidth()]}>
              <SelectField label={label} enabled={enabled} onPress={() => setOpen(true)} />
            </RNHostView>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {/* Material sizes the menu on its content's intrinsic width, so the width is fixed
                here, on the content: the field's width, measured on the outer View. */}
            <Column modifiers={[composeWidth(width), height(MENU_HEIGHT), verticalScroll()]}>
              {options.map((o) => (
                <DropdownMenuItem
                  key={o.value}
                  modifiers={[fillMaxWidth()]}
                  // The current option in brand green, like the highlighted <option> of a select.
                  elementColors={{ textColor: o.value === value ? theme.primaryText : theme.text }}
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
            </Column>
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    </View>
  );
}

const styles = { host: { width: "100%" as const } };
