export function initRankings({ getRows, onSelect }) {
  const dialog = document.querySelector('#rankings-dialog');
  const body = dialog.querySelector('tbody');
  const headers = [...dialog.querySelectorAll('th[data-metric]')];
  let metric = 'underdogIndex';

  const format = (value) => (value == null ? '—' : Math.round(value).toLocaleString());

  function render() {
    const rows = [...getRows()].sort((a, b) => (b[metric] ?? -Infinity) - (a[metric] ?? -Infinity));
    body.replaceChildren(...rows.map((row, index) => {
      const tr = document.createElement('tr');
      const cells = [index + 1, row.name, format(row.underdogIndex), format(row.ringAreaKm2), row.jailerCount ?? '—', format(row.meanSpokeKm), format(row.isolationKm)];
      for (const value of cells) {
        const td = document.createElement('td');
        td.textContent = String(value);
        tr.append(td);
      }
      tr.addEventListener('click', () => { dialog.close(); onSelect(row.id); });
      return tr;
    }));
    for (const header of headers) header.classList.toggle('active', header.dataset.metric === metric);
  }

  for (const header of headers) {
    header.addEventListener('click', () => { metric = header.dataset.metric; render(); });
  }
  const open = () => { render(); dialog.showModal(); };
  document.querySelector('#open-rankings').addEventListener('click', open);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  return { open };
}
