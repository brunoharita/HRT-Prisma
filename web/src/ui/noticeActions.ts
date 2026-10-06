/** Focus an existing correction control. Never submits, reloads or changes domain data. */
export function focusNoticeTarget(selector: string, root: ParentNode = document): boolean {
  const target = [...root.querySelectorAll<HTMLElement>(selector)].find((node) => node.getClientRects().length && !node.hasAttribute("disabled"));
  if (!target) return false;
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  target.focus({ preventScroll: true });
  return true;
}

/** A form/dialog notice takes the operator to its invalid field, then its editable controls. */
export function focusNoticeFields(trigger: HTMLElement): boolean {
  const root = trigger.closest('[role="dialog"], .ant-drawer-body, .ant-card, .prisma-page, .prisma-m74-curation-panel') ?? document;
  return focusNoticeTarget('.ant-form-item-has-error input, .ant-form-item-has-error textarea, .ant-form-item-has-error [role="combobox"], [aria-invalid="true"]', root)
    || focusNoticeTarget('input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), [role="combobox"]:not([aria-disabled="true"])', root);
}
