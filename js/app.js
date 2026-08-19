(() => {
  'use strict';

  const data = window.APP_DATA;
  const state = {
    visible: 6,
    storyIndex: 0,
    favorites: new Set(JSON.parse(localStorage.getItem('favoriteVacancies') || '[]')),
    filters: { query: '', category: 'all', region: 'all', experience: 'all', support: false, sort: 'recommended' }
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const escapeHTML = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function initNavigation() {
    const toggle = $('.menu-toggle');
    const nav = $('.main-nav');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
    });
    $$('.main-nav a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  function populateFilters() {
    const categories = [...new Set(data.vacancies.map(v => v.category))].sort();
    const regions = [...new Set(data.vacancies.map(v => v.region))].sort();
    $('#category-filter').insertAdjacentHTML('beforeend', categories.map(item => `<option>${escapeHTML(item)}</option>`).join(''));
    $('#region-filter').insertAdjacentHTML('beforeend', regions.map(item => `<option>${escapeHTML(item)}</option>`).join(''));
  }

  function salaryLabel(vacancy) {
    return vacancy.salaryTo ? `${money(vacancy.salaryFrom)}–${money(vacancy.salaryTo).replace(' ₽','')}` : `от ${money(vacancy.salaryFrom)}`;
  }

  function filteredVacancies() {
    const query = state.filters.query.trim().toLocaleLowerCase('ru');
    const result = data.vacancies.filter(v => {
      const searchable = `${v.title} ${v.company} ${v.category} ${v.region}`.toLocaleLowerCase('ru');
      return (!query || searchable.includes(query)) &&
        (state.filters.category === 'all' || v.category === state.filters.category) &&
        (state.filters.region === 'all' || v.region === state.filters.region) &&
        (state.filters.experience === 'all' || v.experience === state.filters.experience) &&
        (!state.filters.support || v.support);
    });
    if (state.filters.sort === 'salary-desc') result.sort((a,b) => b.salaryFrom - a.salaryFrom);
    if (state.filters.sort === 'newest') result.sort((a,b) => a.posted - b.posted);
    if (state.filters.sort === 'recommended') result.sort((a,b) => Number(b.featured) - Number(a.featured) || a.posted - b.posted);
    return result;
  }

  function vacancyCard(v) {
    const favorite = state.favorites.has(v.id);
    return `<article class="vacancy-card">
      <button class="favorite-button${favorite ? ' active' : ''}" type="button" data-favorite="${v.id}" aria-label="${favorite ? 'Удалить из избранного' : 'Добавить в избранное'}" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button>
      <div class="vacancy-top"><span class="company-logo">${escapeHTML(v.company.charAt(0))}</span><div><span class="vacancy-company">${escapeHTML(v.company)}</span><h3>${escapeHTML(v.title)}</h3></div></div>
      <div class="vacancy-tags"><span>${escapeHTML(v.region)}</span><span>${escapeHTML(v.experience)}</span><span>${escapeHTML(v.format)}</span>${v.support ? '<span class="support-tag">Есть поддержка</span>' : ''}</div>
      <p>${escapeHTML(v.description)}</p>
      <div class="vacancy-bottom"><div class="vacancy-salary"><small>Зарплата в месяц</small><strong>${salaryLabel(v)}</strong></div><button class="vacancy-open" type="button" data-vacancy="${v.id}">Подробнее</button></div>
    </article>`;
  }

  function renderVacancies() {
    const filtered = filteredVacancies();
    const visible = filtered.slice(0, state.visible);
    $('#vacancies-grid').innerHTML = visible.map(vacancyCard).join('');
    $('#vacancy-count').textContent = `${filtered.length} ${plural(filtered.length, ['вакансия','вакансии','вакансий'])}`;
    $('#vacancies-empty').hidden = filtered.length !== 0;
    $('#vacancies-grid').hidden = filtered.length === 0;
    $('#load-more').hidden = filtered.length <= state.visible;
  }

  function plural(number, words) {
    const n = Math.abs(number) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return words[2];
    if (n1 > 1 && n1 < 5) return words[1];
    if (n1 === 1) return words[0];
    return words[2];
  }

  function bindFilters() {
    const mapping = [
      ['#catalog-query','query','input'], ['#category-filter','category','change'], ['#region-filter','region','change'],
      ['#experience-filter','experience','change'], ['#sort-vacancies','sort','change']
    ];
    mapping.forEach(([selector,key,event]) => $(selector).addEventListener(event, e => {
      state.filters[key] = e.target.value;
      state.visible = 6;
      renderVacancies();
    }));
    $('#support-filter').addEventListener('change', e => { state.filters.support = e.target.checked; state.visible = 6; renderVacancies(); });
    $('#reset-filters').addEventListener('click', resetFilters);
    $$('[data-reset-filters]').forEach(button => button.addEventListener('click', resetFilters));
    $('#load-more').addEventListener('click', () => { state.visible += 4; renderVacancies(); });
    $('#hero-search').addEventListener('submit', e => {
      e.preventDefault();
      state.filters.query = $('#hero-query').value;
      $('#catalog-query').value = state.filters.query;
      state.visible = 6;
      renderVacancies();
      $('#vacancies').scrollIntoView({behavior:'smooth'});
    });
    $$('[data-quick-search]').forEach(button => button.addEventListener('click', () => {
      const query = button.dataset.quickSearch;
      $('#hero-query').value = query;
      state.filters.query = query;
      $('#catalog-query').value = query;
      renderVacancies();
      $('#vacancies').scrollIntoView({behavior:'smooth'});
    }));
  }

  function resetFilters() {
    state.filters = {query:'',category:'all',region:'all',experience:'all',support:false,sort:'recommended'};
    state.visible = 6;
    $('#catalog-query').value = '';
    $('#hero-query').value = '';
    $('#category-filter').value = 'all';
    $('#region-filter').value = 'all';
    $('#experience-filter').value = 'all';
    $('#support-filter').checked = false;
    $('#sort-vacancies').value = 'recommended';
    renderVacancies();
  }

  function renderRegions() {
    $('#regions-grid').innerHTML = data.regions.map(region => `<button class="region-card" type="button" data-region="${region.id}" data-visual="${region.visual}" style="--region-accent:${region.accent}">
      <span class="region-art"></span><span class="region-overlay"></span><span class="region-content"><span class="region-type">${escapeHTML(region.type)}</span><h3>${escapeHTML(region.name)}</h3><p>${escapeHTML(region.lead)}</p><span class="region-meta"><strong>${region.jobs} вакансий</strong><span class="region-arrow">→</span></span></span>
    </button>`).join('');
  }

  function renderSupport() {
    $('#support-grid').innerHTML = data.support.map(item => `<article class="support-card"><span class="support-icon">${item.icon}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.text)}</p><span>${escapeHTML(item.tag)} →</span></article>`).join('');
  }

  function renderStories() {
    $('#stories-track').innerHTML = data.stories.map(story => `<article class="story-card"><div class="story-portrait ${story.tone}" aria-hidden="true"></div><div><span class="story-role">${escapeHTML(story.role)}</span><blockquote>«${escapeHTML(story.quote)}»</blockquote><h3>${escapeHTML(story.name)}</h3><small>${escapeHTML(story.from)}</small><div class="story-result">✓ ${escapeHTML(story.result)}</div></div></article>`).join('');
    updateStories();
  }

  function updateStories() {
    const isMobile = window.matchMedia('(max-width: 980px)').matches;
    const max = isMobile ? data.stories.length - 1 : Math.max(0, data.stories.length - 2);
    state.storyIndex = Math.min(state.storyIndex, max);
    $('#stories-track').style.transform = `translateX(calc(${-state.storyIndex * 100}% - ${state.storyIndex * 18}px))`;
  }

  function initStories() {
    $('#stories-prev').addEventListener('click', () => { state.storyIndex = Math.max(0,state.storyIndex-1); updateStories(); });
    $('#stories-next').addEventListener('click', () => {
      const max = window.matchMedia('(max-width: 980px)').matches ? data.stories.length-1 : data.stories.length-2;
      state.storyIndex = Math.min(max,state.storyIndex+1); updateStories();
    });
    window.addEventListener('resize', updateStories);
  }

  let lastFocused = null;
  function openModal(html) {
    lastFocused = document.activeElement;
    $('#modal-content').innerHTML = html;
    $('#detail-modal').hidden = false;
    document.body.classList.add('modal-open');
    $('.modal-close').focus();
  }

  function closeModal() {
    $('#detail-modal').hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocused) lastFocused.focus();
  }

  function vacancyModal(v) {
    return `<span class="modal-kicker">${escapeHTML(v.company)} · ${escapeHTML(v.region)}</span><h2 id="modal-title">${escapeHTML(v.title)}</h2><p class="modal-lead">${escapeHTML(v.description)}</p><div class="modal-facts"><span>${escapeHTML(v.category)}</span><span>${escapeHTML(v.experience)}</span><span>${escapeHTML(v.format)}</span>${v.support?'<span>Поддержка при переезде</span>':''}</div><div class="modal-salary">${salaryLabel(v)} <small>в месяц</small></div><div class="modal-columns"><div><h3>Что важно</h3><ul>${v.requirements.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul></div><div><h3>Что предлагает работодатель</h3><ul>${v.benefits.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul></div></div><button class="button" type="button" data-apply="${v.id}">Откликнуться на вакансию</button>`;
  }

  function regionModal(region) {
    return `<div class="region-modal-art" style="--region-accent:${region.accent}"></div><span class="modal-kicker">${escapeHTML(region.type)}</span><h2 id="modal-title">${escapeHTML(region.name)}</h2><p class="modal-lead">${escapeHTML(region.description)}</p><div class="modal-facts">${region.facts.map(f=>`<span>${escapeHTML(f)}</span>`).join('')}</div><button class="button" type="button" data-region-jobs="${escapeHTML(region.name)}">Посмотреть ${region.jobs} вакансий</button>`;
  }

  function bindCardsAndModal() {
    document.addEventListener('click', e => {
      const vacancyButton = e.target.closest('[data-vacancy]');
      const regionButton = e.target.closest('[data-region]');
      const favoriteButton = e.target.closest('[data-favorite]');
      if (vacancyButton) {
        const vacancy = data.vacancies.find(v => v.id === Number(vacancyButton.dataset.vacancy));
        openModal(vacancyModal(vacancy));
      }
      if (regionButton) {
        const region = data.regions.find(r => r.id === regionButton.dataset.region);
        openModal(regionModal(region));
      }
      if (favoriteButton) toggleFavorite(Number(favoriteButton.dataset.favorite));
      if (e.target.closest('[data-close-modal]')) closeModal();
      const apply = e.target.closest('[data-apply]');
      if (apply) {
        const v = data.vacancies.find(item => item.id === Number(apply.dataset.apply));
        closeModal();
        $('[name="topic"]').value = 'Подобрать вакансии';
        $('[name="message"]').value = `Хочу откликнуться на вакансию «${v.title}» в компании «${v.company}».`;
        $('#consultation').scrollIntoView({behavior:'smooth'});
      }
      const jobs = e.target.closest('[data-region-jobs]');
      if (jobs) {
        const option = [...$('#region-filter').options].find(item => item.value === jobs.dataset.regionJobs);
        closeModal();
        if (option) { $('#region-filter').value = option.value; state.filters.region = option.value; }
        renderVacancies();
        $('#vacancies').scrollIntoView({behavior:'smooth'});
      }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#detail-modal').hidden) closeModal(); });
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) { state.favorites.delete(id); showToast('Удалено из избранного'); }
    else { state.favorites.add(id); showToast('Вакансия добавлена в избранное'); }
    localStorage.setItem('favoriteVacancies', JSON.stringify([...state.favorites]));
    renderVacancies();
  }

  function initForms() {
    const form = $('#consultation-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const required = $$('[required]', form);
      let valid = true;
      required.forEach(field => {
        const fieldValid = field.type === 'checkbox' ? field.checked : field.value.trim() !== '';
        field.setAttribute('aria-invalid', String(!fieldValid));
        if (!fieldValid) valid = false;
      });
      if (!valid) { showToast('Проверьте обязательные поля'); return; }
      showToast('Заявка сохранена в демонстрационном режиме');
      form.reset();
    });
    $('[name="phone"]').addEventListener('input', e => {
      let digits = e.target.value.replace(/\D/g,'').replace(/^8/,'7').slice(0,11);
      if (digits && digits[0] !== '7') digits = '7' + digits;
      let value = digits ? '+7' : '';
      if (digits.length > 1) value += ` ${digits.slice(1,4)}`;
      if (digits.length >= 5) value += ` ${digits.slice(4,7)}`;
      if (digits.length >= 8) value += `-${digits.slice(7,9)}`;
      if (digits.length >= 10) value += `-${digits.slice(9,11)}`;
      e.target.value = value;
    });
  }

  function initChat() {
    const panel = $('#chat-panel');
    const messages = $('#chat-messages');
    const open = () => { panel.hidden = false; $('.chat-launcher').hidden = true; $('#chat-input').focus(); };
    const close = () => { panel.hidden = true; $('.chat-launcher').hidden = false; };
    $$('[data-open-chat]').forEach(button => button.addEventListener('click', open));
    $('[data-close-chat]').addEventListener('click', close);
    $('#quick-questions').innerHTML = data.faq.slice(0,4).map((item,index)=>`<button type="button" data-faq="${index}">${escapeHTML(item.q)}</button>`).join('');
    $('#quick-questions').addEventListener('click', e => {
      const button = e.target.closest('[data-faq]');
      if (button) answerQuestion(data.faq[Number(button.dataset.faq)].q);
    });
    $('#chat-form').addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#chat-input');
      if (!input.value.trim()) return;
      answerQuestion(input.value.trim());
      input.value = '';
    });
    function answerQuestion(question) {
      appendMessage(question,'user');
      const normalized = question.toLocaleLowerCase('ru');
      const match = data.faq.map(item => ({item,score:item.keywords.filter(key=>normalized.includes(key)).length})).sort((a,b)=>b.score-a.score)[0];
      const answer = match && match.score ? match.item.a : 'Пока не нашёл точный ответ. Оставьте заявку на консультацию — специалист свяжется и поможет разобраться.';
      setTimeout(()=>appendMessage(answer,'bot'),300);
    }
    function appendMessage(text,type) {
      const node = document.createElement('div');
      node.className = `chat-message ${type}`;
      node.textContent = text;
      messages.appendChild(node);
      messages.scrollTop = messages.scrollHeight;
    }
  }

  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>toast.classList.remove('visible'),2600);
  }

  function init() {
    initNavigation();
    populateFilters();
    renderVacancies();
    renderRegions();
    renderSupport();
    renderStories();
    bindFilters();
    bindCardsAndModal();
    initStories();
    initForms();
    initChat();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
