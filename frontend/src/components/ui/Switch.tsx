import * as SwitchPrimitive from '@radix-ui/react-switch';

type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
};

export function Switch({ checked, onCheckedChange, ariaLabel }: Props) {
  return (
    <SwitchPrimitive.Root
      className="switch-root"
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
    >
      <SwitchPrimitive.Thumb className="switch-thumb" />
    </SwitchPrimitive.Root>
  );
}
