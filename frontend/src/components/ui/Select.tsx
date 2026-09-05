import { useId } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

/**
 * GENERICS with a constraint (`TOption extends SelectOption`): the bank
 * dropdown wants to pass full `Bank` objects through so the caller can read
 * back more than `value`/`label` if needed, while the bank-account dropdown
 * wants a lighter `{ value, label }` pair. `extends SelectOption` means
 * "any shape is fine, as long as it has at least a value and a label" —
 * looser than requiring an exact `SelectOption`, tighter than `any`.
 */
interface SelectProps<TOption extends SelectOption> {
  label: string;
  name: string;
  options: TOption[];
  placeholder?: string;
  required?: boolean;
}

export function Select<TOption extends SelectOption>({
  label, name, options, placeholder, required,
}: SelectProps<TOption>) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <select id={id} name={name} required={required} defaultValue="" className="field__input">
        <option value="" disabled>
          {placeholder ?? 'Select an option'}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
