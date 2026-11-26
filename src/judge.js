// Navigation only: no progress scores, browser storage or research writes.
const buttons = [...document.querySelectorAll('[data-task]')];
const panels = [...document.querySelectorAll('[data-task-panel]')];
function selectTask(button) {
  const target = document.getElementById(button.getAttribute('aria-controls'));
  if (!panels.includes(target)) return;
  for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
  for (const panel of panels) panel.hidden = panel !== target;
}
for (const button of buttons) button.addEventListener('click', () => selectTask(button));
if (buttons.length) {
  selectTask(buttons[0]);
  document.querySelector('.task-selectors').hidden = false;
}
document.getElementById('btn-print')?.addEventListener('click', () => window.print());
