export function initMethodology() {
  const dialog = document.querySelector('#methodology-dialog');
  const open = () => dialog.showModal();
  document.querySelector('#open-methodology').addEventListener('click', open);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  return { open };
}
