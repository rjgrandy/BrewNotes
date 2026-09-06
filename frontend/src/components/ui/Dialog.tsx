import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ReactNode } from 'react';
import { cn } from './cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

type ContentProps = {
  children: ReactNode;
  className?: string;
  /** Wider layout for galleries / detail views. */
  wide?: boolean;
  /** Transparent shell (e.g. image lightbox). */
  bare?: boolean;
};

export function DialogContent({ children, className, wide, bare }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn('dialog-content', wide && 'dialog-wide', bare && 'dialog-bare', className)}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
