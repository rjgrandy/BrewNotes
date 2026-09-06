import { KeyboardEvent } from 'react';

export function radioKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number, count: number, select: (index: number) => void) {
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1
    : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % count
    : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index + count - 1) % count : null;
  if (next === null) return;
  event.preventDefault();
  select(next);
  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
}
