const searchInput = document.querySelector('[data-faq-search]');
const items = [...document.querySelectorAll('[data-faq-item]')];
const sections = [...document.querySelectorAll('[data-faq-section]')];
const emptyState = document.querySelector('[data-faq-empty]');

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function applyFilter() {
  const query = normalize(searchInput?.value);
  let visibleCount = 0;

  items.forEach(item => {
    const haystack = normalize(item.textContent);
    const visible = !query || haystack.includes(query);
    item.hidden = !visible;
    if (visible) {
      visibleCount += 1;
      if (query) item.open = true;
    }
  });

  sections.forEach(section => {
    const hasVisibleItem = [...section.querySelectorAll('[data-faq-item]')].some(item => !item.hidden);
    section.hidden = !hasVisibleItem;
  });

  if (emptyState) emptyState.hidden = visibleCount !== 0;
}

searchInput?.addEventListener('input', applyFilter);
