import { InputOTP, REGEXP_ONLY_DIGITS } from "heroui-native";

export interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

export function PinInput(props: PinInputProps) {
  const { value, onChange, onComplete } = props;
  return (
    <InputOTP
      maxLength={4}
      pattern={REGEXP_ONLY_DIGITS}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
    >
      <InputOTP.Group>
        <InputOTP.Slot index={0} />
        <InputOTP.Slot index={1} />
        <InputOTP.Slot index={2} />
        <InputOTP.Slot index={3} />
      </InputOTP.Group>
    </InputOTP>
  );
}
