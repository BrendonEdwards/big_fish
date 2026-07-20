export function initMethodology() {
  const dialog = document.querySelector('#methodology-dialog');
  const open = () => dialog.showModal();
  document.querySelector('#open-methodology').addEventListener('click', open);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  const copyButton = document.querySelector('#copy-formula');
  copyButton?.addEventListener('click', async () => {
    const source = document.querySelector('#formula-source')?.textContent ?? '';
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(source).catch(() => {});
    const original = copyButton.textContent;
    copyButton.textContent = 'Copied';
    window.setTimeout(() => { copyButton.textContent = original; }, 1500);
  });
  return { open };
}
