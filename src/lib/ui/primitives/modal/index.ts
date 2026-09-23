import { Dialog as DialogPrimitive } from 'bits-ui';

export { default as ModalContent } from './modal-content.svelte';
export { default as ModalOverlay } from './modal-overlay.svelte';
export { default as ModalHeader } from './modal-header.svelte';
export { default as ModalFooter } from './modal-footer.svelte';
export { default as ModalTitle } from './modal-title.svelte';
export { default as ModalDescription } from './modal-description.svelte';

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;
