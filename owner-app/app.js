'use strict';

const cards = [...document.querySelectorAll('.tool-card')];
const search = document.querySelector('#search');
const toast = document.querySelector('#toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function openOwner(route) {
  if (!window.nexaOwnerApp?.openOwner) {
    showToast('Az Owner Center kapcsolata nem érhető el.');
    return;
  }
  window.nexaOwnerApp.openOwner(route);
}

for (const button of document.querySelectorAll('[data-route]')) {
  button.addEventListener('click', () => openOwner(button.dataset.route));
}

for (const button of document.querySelectorAll('[data-home], [data-section="overview"], #open-overview')) {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    window.nexaOwnerApp?.openHome();
  });
}

document.querySelector('#refresh').addEventListener('click', () => {
  window.nexaOwnerApp?.refresh();
});

search.addEventListener('input', () => {
  const term = search.value.trim().toLocaleLowerCase('hu-HU');
  for (const card of cards) {
    card.classList.toggle('hidden', Boolean(term) && !(card.innerText + ' ' + card.dataset.search).toLocaleLowerCase('hu-HU').includes(term));
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    search.focus();
  }
  if (event.key === 'Escape' && document.activeElement === search) {
    search.value = '';
    search.dispatchEvent(new Event('input'));
    search.blur();
  }
});
