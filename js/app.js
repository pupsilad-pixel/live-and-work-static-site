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
  const placeholderImages = {
    urban: 'assets/images/placeholders/tatarstan-urban.png',
    tech: 'assets/images/placeholders/tatarstan-tech.png',
    nature: 'assets/images/placeholders/tatarstan-nature.png'
  };

  function regionImageSet(region) {
    if (region.visual === 'innopolis') return [placeholderImages.tech, placeholderImages.urban, placeholderImages.nature];
    if (['arsk','tukaevsky'].includes(region.visual)) return [placeholderImages.nature, placeholderImages.urban, placeholderImages.tech];
    if (['chelny','almet','nizhnekamsk'].includes(region.visual)) return [placeholderImages.urban, placeholderImages.tech, placeholderImages.nature];
    return [placeholderImages.urban, placeholderImages.nature, placeholderImages.tech];
  }

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

  function renderStats() {
    const categories = new Set(data.vacancies.map(v => v.category));
    $('#hero-vacancy-count').textContent = data.vacancies.length;
    $('#hero-support-count').textContent = data.support.length;
    $('#stats-regions').textContent = data.regions.length;
    $('#stats-categories').textContent = categories.size;
    $('#stats-support').textContent = data.support.length;
    $('#stats-stories').textContent = data.stories.length;
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
    $('#regions-grid').innerHTML = data.regions.map(region => {
      const jobs = data.vacancies.filter(v => v.region === region.name).length;
      const cover = regionImageSet(region)[0];
      return `<button class="region-card" type="button" data-region="${region.id}" data-visual="${region.visual}" style="--region-accent:${region.accent};--region-image:url('${cover}')">
      <span class="region-art"></span><span class="region-overlay"></span><span class="region-content"><span class="region-type">${escapeHTML(region.type)}</span><h3>${escapeHTML(region.name)}</h3><p>${escapeHTML(region.lead)}</p><span class="region-meta"><strong>${jobs} ${plural(jobs,['вакансия','вакансии','вакансий'])} в демоверсии</strong><span class="region-arrow">→</span></span></span>
    </button>`;
    }).join('');
  }

  function renderSupport() {
    $('#support-grid').innerHTML = data.support.map(item => `<button class="support-card" type="button" data-support="${item.id}"><span class="support-icon">${item.icon}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.text)}</p><span>${escapeHTML(item.tag)} →</span></button>`).join('');
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
    const region = data.regions.find(item => item.name === v.region);
    return `<span class="modal-kicker">${escapeHTML(v.company)} · ${escapeHTML(v.region)}</span><h2 id="modal-title">${escapeHTML(v.title)}</h2><p class="modal-lead">${escapeHTML(v.description)}</p><div class="modal-facts"><span>${escapeHTML(v.category)}</span><span>${escapeHTML(v.experience)}</span><span>${escapeHTML(v.format)}</span>${v.support?'<span>Поддержка при переезде</span>':''}</div><div class="modal-salary">${salaryLabel(v)} <small>в месяц</small></div><div class="modal-columns"><div><h3>Что важно</h3><ul>${v.requirements.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul></div><div><h3>Что предлагает работодатель</h3><ul>${v.benefits.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul></div></div><div class="modal-actions"><button class="button" type="button" data-apply="${v.id}">Откликнуться</button>${region ? `<button class="button button-secondary" type="button" data-region-from-vacancy="${region.id}">Узнать о ${escapeHTML(region.name)}</button>` : ''}</div><p class="modal-disclaimer">Данные вакансии демонстрационные и требуют подтверждения работодателем.</p>`;
  }

  function regionModal(region) {
    const jobs = data.vacancies.filter(v => v.region === region.name).length;
    const supports = region.supportIds.map(id => data.support.find(item => item.id === id)).filter(Boolean);
    const images = regionImageSet(region);
    const livingLabels = {housing:'Жильё',education:'Образование',medicine:'Медицина',transport:'Транспорт'};
    return `<div class="region-modal-art" style="--region-accent:${region.accent};--region-image:url('${images[0]}')"></div><span class="modal-kicker">${escapeHTML(region.type)} · паспорт территории</span><h2 id="modal-title">${escapeHTML(region.name)}</h2><p class="modal-lead">${escapeHTML(region.description)}</p><div class="passport-gallery" aria-label="Иллюстративная галерея территории">${region.gallery.map((item,index)=>`<figure><img src="${images[index]}" alt="Иллюстративная заглушка: ${escapeHTML(item)}" loading="lazy"><figcaption><strong>${escapeHTML(item)}</strong><small>AI-заглушка, не документальная фотография</small></figcaption></figure>`).join('')}</div><div class="modal-facts">${region.facts.map(f=>`<span>${escapeHTML(f)}</span>`).join('')}</div><h3 class="modal-section-title">Условия для жизни</h3><div class="living-grid">${Object.entries(region.living).map(([key,value])=>`<article><strong>${livingLabels[key]}</strong><p>${escapeHTML(value)}</p></article>`).join('')}</div><h3 class="modal-section-title">Доступные направления поддержки</h3><div class="region-supports">${supports.map(item=>`<button type="button" data-support="${item.id}">${item.icon} ${escapeHTML(item.title)}</button>`).join('')}</div><div class="modal-actions"><button class="button" type="button" data-region-jobs="${escapeHTML(region.name)}">Показать ${jobs} ${plural(jobs,['вакансию','вакансии','вакансий'])}</button><button class="button button-secondary" type="button" data-consult-region="${escapeHTML(region.name)}">Консультация по переезду</button></div>`;
  }

  function supportModal(item) {
    return `<span class="modal-kicker">Мера поддержки · требуется официальное подтверждение</span><h2 id="modal-title">${escapeHTML(item.title)}</h2><p class="modal-lead">${escapeHTML(item.text)}</p><div class="modal-facts"><span>${escapeHTML(item.scope)}</span><span>${escapeHTML(item.tag)}</span></div><h3 class="modal-section-title">Кому может подойти</h3><p>${escapeHTML(item.audience)}</p><h3 class="modal-section-title">Что потребуется проверить</h3><ul class="support-conditions">${item.conditions.map(condition=>`<li>${escapeHTML(condition)}</li>`).join('')}</ul><div class="modal-actions"><button class="button" type="button" data-consult-support="${escapeHTML(item.title)}">Уточнить условия</button></div><p class="modal-disclaimer">Точные условия, суммы и документы должны быть сверены с официальной программой и нормативным источником.</p>`;
  }

  function privacyModal() {
    return `<span class="modal-kicker">Демонстрационный документ</span><h2 id="modal-title">Политика конфиденциальности</h2><p class="modal-lead">Текущая версия сайта не отправляет и не сохраняет введённые в форму персональные данные. Избранные вакансии сохраняются только на устройстве пользователя в localStorage.</p><h3 class="modal-section-title">Перед публичным запуском</h3><ul class="support-conditions"><li>Указать оператора персональных данных и юридические реквизиты.</li><li>Описать цели, сроки и основания обработки.</li><li>Указать подключённые сервисы аналитики и обработки заявок.</li><li>Добавить порядок отзыва согласия и удаления данных.</li></ul><p class="modal-disclaimer">Этот текст не является готовым юридическим документом.</p>`;
  }

  function bindCardsAndModal() {
    document.addEventListener('click', e => {
      const vacancyButton = e.target.closest('[data-vacancy]');
      const regionButton = e.target.closest('[data-region]');
      const supportButton = e.target.closest('[data-support]');
      const favoriteButton = e.target.closest('[data-favorite]');
      if (vacancyButton) {
        const vacancy = data.vacancies.find(v => v.id === Number(vacancyButton.dataset.vacancy));
        openModal(vacancyModal(vacancy));
      }
      if (regionButton) {
        const region = data.regions.find(r => r.id === regionButton.dataset.region);
        openModal(regionModal(region));
      }
      if (supportButton) {
        const support = data.support.find(item => item.id === supportButton.dataset.support);
        if (support) openModal(supportModal(support));
      }
      if (favoriteButton) toggleFavorite(Number(favoriteButton.dataset.favorite));
      if (e.target.closest('[data-privacy]')) openModal(privacyModal());
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
      const vacancyRegion = e.target.closest('[data-region-from-vacancy]');
      if (vacancyRegion) {
        const region = data.regions.find(item => item.id === vacancyRegion.dataset.regionFromVacancy);
        if (region) openModal(regionModal(region));
      }
      const consultRegion = e.target.closest('[data-consult-region]');
      const consultSupport = e.target.closest('[data-consult-support]');
      if (consultRegion || consultSupport) {
        const subject = consultRegion ? `переезду в ${consultRegion.dataset.consultRegion}` : `мере поддержки «${consultSupport.dataset.consultSupport}»`;
        closeModal();
        $('[name="topic"]').value = 'Узнать о мерах поддержки';
        $('[name="message"]').value = `Нужна консультация по ${subject}.`;
        $('#consultation').scrollIntoView({behavior:'smooth'});
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
      showToast('Проверка пройдена. В демоверсии данные не отправляются');
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
      const region = data.regions.find(item => normalized.includes(item.name.toLocaleLowerCase('ru').replace(' район','')));
      const category = [...new Set(data.vacancies.map(v=>v.category))].find(item => normalized.includes(item.toLocaleLowerCase('ru')));
      const match = data.faq.map(item => ({item,score:item.keywords.filter(key=>normalized.includes(key)).length})).sort((a,b)=>b.score-a.score)[0];
      let answer;
      if (region) {
        const jobs = data.vacancies.filter(v=>v.region === region.name).length;
        answer = `${region.name}: ${region.lead} В демокаталоге сейчас ${jobs} ${plural(jobs,['вакансия','вакансии','вакансий'])}. Откройте паспорт территории в разделе «Города и районы».`;
      } else if (category) {
        const jobs = data.vacancies.filter(v=>v.category === category).length;
        answer = `По направлению «${category}» в демокаталоге ${jobs} ${plural(jobs,['вакансия','вакансии','вакансий'])}. Перейдите к вакансиям и выберите это направление в фильтре.`;
      } else {
        answer = match && match.score ? match.item.a : 'Пока не нашёл точный ответ. Оставьте заявку на консультацию — после подключения сервера специалист сможет связаться с вами.';
      }
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
    renderStats();
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
