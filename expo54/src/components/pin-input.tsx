import { InputOTP, REGEXP_ONLY_DIGITS, useInputOTP } from "heroui-native";

export interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
}

export function PinInput(props: PinInputProps) {
  const { value, onChange, onComplete, autoFocus } = props;
  return (
    <InputOTP
      maxLength={4}
      pattern={REGEXP_ONLY_DIGITS}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      textInputProps={autoFocus ? { autoFocus: true } : undefined}
    >
      <PinInputSlots />
    </InputOTP>
  );
}

// Masks each filled slot with a dot instead of the literal digit, since this
// input is used on lock screens where the PIN must not be shown in plaintext.
function PinInputSlots() {
  const { slots } = useInputOTP();
  return (
    <InputOTP.Group>
      {slots.map((slot, index) => (
        <InputOTP.Slot key={index} index={index}>
          <InputOTP.SlotPlaceholder />
          <InputOTP.SlotValue>{slot.char ? "•" : undefined}</InputOTP.SlotValue>
          <InputOTP.SlotCaret />
        </InputOTP.Slot>
      ))}
    </InputOTP.Group>
  );
}
