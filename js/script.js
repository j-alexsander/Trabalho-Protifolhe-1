(function () {
  'use strict';

  
  const LINKS = {
    github: '',    
    linkedin: '',  
    strava: ''     
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pad2 = (n) => String(n).padStart(2, '0');

  
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  
  const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf3 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

  function debounce(fn, wait) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  
  function onMediaChange(query, callback) {
    const handler = (event) => callback(event.matches);
    if (query.addEventListener) query.addEventListener('change', handler);
    else query.addListener(handler);
  }

  function parseDecimal(text) {
    const value = String(text).trim().replace(',', '.');
    if (!/^\d*\.?\d*$/.test(value) || !/\d/.test(value)) return NaN;
    return Number(value);
  }

  function formatClock(totalSeconds) {
    const total = Math.round(totalSeconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? h + ':' + pad2(m) + ':' + pad2(s) : m + ':' + pad2(s);
  }

  function formatPace(secondsPerKm) {
    const total = Math.round(secondsPerKm);
    return Math.floor(total / 60) + ':' + pad2(total % 60);
  }

  function formatKm(km) {
    return nf3.format(Math.floor(km * 1000 + 1e-6) / 1000);
  }

  function svgIcon(id) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  function setMessage(element, text) {
    element.textContent = '';
    if (!text) return;
    const span = document.createElement('span');
    span.textContent = text;            
    element.append(svgIcon('i-alert'), span);
  }

  function pressGuard(container) {
    let pressing = false;
    let timer;
    const release = () => { pressing = false; clearTimeout(timer); };
    container.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('button')) return;
      pressing = true;
      clearTimeout(timer);
      timer = setTimeout(release, 800);
    });
    container.addEventListener('click', () => setTimeout(release, 0));
    return () => pressing;
  }


  function initHeader() {
    const header = $('[data-header]');
    const toggle = $('[data-nav-toggle]');
    const nav = $('[data-nav]');
    const bar = $('[data-progress]');
    if (!header || !toggle || !nav) return;

    const links = $$('.nav__link', nav);
    const sections = links
      .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
      .filter(Boolean);
    const desktop = window.matchMedia('(min-width: 960px)');

   
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    function setMenu(open) {
      nav.classList.toggle('is-open', open);
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('no-scroll', open);
    }

    toggle.addEventListener('click', () => setMenu(!isOpen()));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setMenu(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (isOpen() && !header.contains(event.target)) setMenu(false);
    });

    header.addEventListener('focusout', (event) => {
      if (isOpen() && event.relatedTarget && !header.contains(event.relatedTarget)) setMenu(false);
    });

    onMediaChange(desktop, (matches) => { if (matches) setMenu(false); });

    function goTo(target) {
      if (target === document.body || target.id === 'inicio') {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
      } else {

        target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      }

      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const id = link.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;

      event.preventDefault();
      setMenu(false);
      goTo(target);
      try { history.pushState(null, '', '#' + id); } catch (error) { /* alguns navegadores bloqueiam em file:// */ }
    });

    function updateScrollState() {
      const y = window.scrollY || document.documentElement.scrollTop;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      header.classList.toggle('is-scrolled', y > 8);

      if (bar) {
        const progress = max > 0 ? clamp(y / max, 0, 1) : 0;
        bar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
      }

      const readingLine = window.innerHeight * 0.35;
      let current = sections[0];
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= readingLine) current = section;
      });
      if (max > 0 && y >= max - 2) current = sections[sections.length - 1];

      links.forEach((link) => {
        if (current && link.getAttribute('href') === '#' + current.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateScrollState();
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateScrollState();
  }

  function initFilters() {
    const group = $('[data-filters]');
    if (!group) return;

    const buttons = $$('[data-filter]', group);
    const cards = $$('.race');
    const status = $('[data-filter-status]');

    function apply(filter) {
      let shown = 0;
      let title = '';

      cards.forEach((card) => {
        const show = filter === 'todas' || card.dataset.distance === filter;
        const wasHidden = card.hidden;
        card.hidden = !show;
        if (!show) return;
        shown += 1;
        title = $('.race__title', card).textContent.replace(/ /g, ' ');
        if (wasHidden) {

          card.classList.remove('is-entering');
          void card.offsetWidth;
          card.classList.add('is-entering');
          card.addEventListener('animationend', () => card.classList.remove('is-entering'), { once: true });
        }
      });

      buttons.forEach((button) => {
        const on = button.dataset.filter === filter;
        button.setAttribute('aria-pressed', String(on));
        button.classList.toggle('is-active', on);
      });

      if (status) {
        status.textContent = filter === 'todas'
          ? 'Mostrando as ' + shown + ' modalidades.'
          : 'Mostrando 1 modalidade: ' + title + '.';
      }
    }

    buttons.forEach((button) => button.addEventListener('click', () => apply(button.dataset.filter)));
  }


 
  function initTabs() {
    const list = $('[data-tabs]');
    if (!list) return;

    const tabs = $$('[role="tab"]', list);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

    function select(index, options = {}) {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;     
        if (panels[i]) {
          const wasHidden = panels[i].hidden;
          panels[i].hidden = !on;
          if (on && wasHidden && options.animate) {
            panels[i].classList.remove('is-entering');
            void panels[i].offsetWidth;
            panels[i].classList.add('is-entering');
            panels[i].addEventListener('animationend', () => panels[i].classList.remove('is-entering'), { once: true });
          }
        }
      });
      if (options.focus) tabs[index].focus();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index, { animate: true }));

      
      tab.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        select(next, { animate: true, focus: true });
      });
    });

    select(0);  
  }

  function initCalculator() {
    const form = $('#form-calc');
    if (!form) return;

    const distInput = $('#calc-dist');
    const timeInputs = [$('#calc-h'), $('#calc-m'), $('#calc-s')];
    const minutesInput = timeInputs[1];
    const distMsg = $('[data-error="dist"]');
    const timeMsg = $('[data-error="tempo"]');
    const distFieldset = distInput.closest('fieldset');
    const timeFieldset = minutesInput.closest('fieldset');
    const chips = $$('[data-dist]', form);

    const box = $('[data-result]');
    const emptyState = $('[data-result-empty]', box);
    const mainState = $('[data-result-main]', box);
    const outPace = $('[data-out="pace"]', box);
    const outSpeed = $('[data-out="speed"]', box);
    const projItems = $$('[data-proj]', box);
    const riegelSwitch = $('[data-riegel]', box);
    const note = $('[data-note]', box);
    const splitsBox = $('.splits', box);
    const splitsBody = $('[data-splits]', box);
    const live = $('[data-result-live]', box);

    
    const PROJECTIONS = { '5k': 5, '10k': 10, '21k': 21.0975, '42k': 42.195 };
    const RIEGEL_EXPONENT = 1.06;   
    const MAX_SPEED_KMH = 40;       
    const MAX_DISTANCE_KM = 1000;
    const MAX_SPLITS_KM = 100;      

    const NOTE_FLAT = 'Projeção estimada: mantém o mesmo ritmo do início ao fim da prova.';
    const NOTE_RIEGEL = 'Fórmula de Riegel: tempo × (nova distância ÷ distância informada)^1,06. ' +
      'O ritmo piora um pouco conforme a prova fica mais longa. É uma estimativa, mais confiável entre 5 km e a maratona.';
    const NOTE_RIEGEL_RANGE = ' Sua distância está fora da faixa em que essa fórmula costuma acertar.';

    const state = {
      submitted: false,        
      touched: new Set(),      
      last: null               
    };
    const isPressing = pressGuard(form);

   
    function readInputs() {
      const errors = { dist: '', time: '' };
      const flagged = { dist: [], time: [] };

      // Distância
      const rawDist = distInput.value.trim();
      const dist = parseDecimal(rawDist);
      if (rawDist === '') errors.dist = 'Informe a distância em quilômetros.';
      else if (Number.isNaN(dist)) errors.dist = 'Use só números, como 10 ou 10,5.';
      else if (dist <= 0) errors.dist = 'A distância precisa ser maior que zero.';
      else if (dist > MAX_DISTANCE_KM) errors.dist = 'A distância máxima é 1000 km.';
      if (errors.dist) flagged.dist.push(distInput);

      const parts = timeInputs.map((input) => {
        const text = input.value.trim();
        return text === '' ? 0 : (/^\d+$/.test(text) ? Number(text) : NaN);
      });
      const [h, m, s] = parts;

      if (parts.some(Number.isNaN)) {
        errors.time = 'Use só números inteiros no tempo.';
        timeInputs.forEach((input, i) => { if (Number.isNaN(parts[i])) flagged.time.push(input); });
      } else if (m > 59 || s > 59) {
        errors.time = 'Minutos e segundos vão de 0 a 59. Para tempos longos, use o campo de horas.';
        if (m > 59) flagged.time.push(timeInputs[1]);
        if (s > 59) flagged.time.push(timeInputs[2]);
      } else if (h * 3600 + m * 60 + s === 0) {
        errors.time = 'Informe o tempo total: horas, minutos ou segundos.';
        flagged.time.push(...timeInputs);
      }

      const seconds = Number.isNaN(h + m + s) ? NaN : h * 3600 + m * 60 + s;

      
      if (!errors.dist && !errors.time && dist / (seconds / 3600) > MAX_SPEED_KMH) {
        errors.time = 'Esse ritmo passa de 40 km/h. Confira a distância e o tempo.';
        flagged.time.push(...timeInputs);
        flagged.dist.push(distInput);
      }

      return { ok: !errors.dist && !errors.time, dist, seconds, errors, flagged };
    }

   
    function paintErrors(result, live) {
      const groups = [
        { key: 'dist', element: distMsg, inputs: [distInput] },
        { key: 'time', element: timeMsg, inputs: timeInputs }
      ];
      groups.forEach(({ key, element, inputs }) => {
        const message = result.errors[key];
        if (!message) {
          setMessage(element, '');
          inputs.forEach((input) => input.removeAttribute('aria-invalid'));
          return;
        }
        const canShow = state.submitted || state.touched.has(key);
        const alreadyShowing = element.textContent !== '';
        if (!canShow || (live && !alreadyShowing)) return;
        setMessage(element, message);
        inputs.forEach((input) => {
          if (result.flagged[key].includes(input)) input.setAttribute('aria-invalid', 'true');
          else input.removeAttribute('aria-invalid');
        });
      });
    }

    
    function projectedSeconds(targetKm) {
      const { dist, seconds } = state.last;
      return riegelSwitch.checked
        ? seconds * Math.pow(targetKm / dist, RIEGEL_EXPONENT) 
        : (seconds / dist) * targetKm;                           
    }

    function renderProjections() {
      projItems.forEach((item) => {
        const km = PROJECTIONS[item.dataset.proj];
        const seconds = projectedSeconds(km);
        $('[data-proj-time]', item).textContent = formatClock(seconds);
        $('[data-proj-pace]', item).textContent = formatPace(seconds / km) + ' /km';
      });

      let text = riegelSwitch.checked ? NOTE_RIEGEL : NOTE_FLAT;
      if (riegelSwitch.checked && (state.last.dist < 1.5 || state.last.dist > 50)) text += NOTE_RIEGEL_RANGE;
      note.textContent = text;
    }

    function createRow(label, time) {
      const row = document.createElement('tr');
      const th = document.createElement('th');
      const td = document.createElement('td');
      th.scope = 'row';
      th.textContent = label;
      td.textContent = time;
      row.append(th, td);
      return row;
    }

    function renderSplits() {
      const { dist, seconds } = state.last;
      splitsBody.textContent = '';
      splitsBox.hidden = dist > MAX_SPLITS_KM;
      if (splitsBox.hidden) return;

      const pace = seconds / dist;
      const whole = Math.floor(dist + 1e-9);
      const rows = document.createDocumentFragment();
      for (let km = 1; km <= whole; km += 1) rows.appendChild(createRow(String(km), formatClock(pace * km)));
      // Sobrou um pedaço (por exemplo, os 97 m finais da meia maratona)
      if (dist - whole > 1e-6) rows.appendChild(createRow(formatKm(dist), formatClock(seconds)));
      splitsBody.appendChild(rows);
    }

    const speak = debounce((text) => { live.textContent = text; }, 600);

    function showResult(dist, seconds) {
      state.last = { dist, seconds };
      outPace.textContent = formatPace(seconds / dist);
      outSpeed.textContent = nf1.format(dist / (seconds / 3600));
      renderProjections();
      renderSplits();

      emptyState.hidden = true;
      mainState.hidden = false;
      mainState.classList.remove('is-stale');

      const pace = Math.round(seconds / dist);
      speak('Pace de ' + Math.floor(pace / 60) + ' minutos e ' + (pace % 60) + ' segundos por quilômetro. ' +
        'Velocidade média de ' + nf1.format(dist / (seconds / 3600)) + ' quilômetros por hora.');
    }

    function showEmpty() {
      state.last = null;
      mainState.hidden = true;
      mainState.classList.remove('is-stale');
      emptyState.hidden = false;
    }


    function syncChips() {
      const current = parseDecimal(distInput.value);
      chips.forEach((chip) => {
        const on = !Number.isNaN(current) && Math.abs(parseDecimal(chip.dataset.dist) - current) < 1e-9;
        chip.setAttribute('aria-pressed', String(on));
        chip.classList.toggle('is-active', on);
      });
    }

    
    function render(live) {
      const result = readInputs();
      paintErrors(result, live);
      syncChips();
      if (result.ok) showResult(result.dist, result.seconds);
      else if (live && state.last) mainState.classList.add('is-stale');
      else showEmpty();
      return result;
    }

    function focusFirstProblem(result) {
      const target = result.flagged.dist[0] || result.flagged.time[0];
      if (!target) return;
      
      const allTimeFieldsFlagged = result.flagged.time.length === timeInputs.length;
      (!result.flagged.dist.length && allTimeFieldsFlagged ? minutesInput : target).focus();
    }

    
    distInput.addEventListener('input', () => {
      const clean = distInput.value.replace(/[^\d.,]/g, '');
      if (clean !== distInput.value) distInput.value = clean;
      render(true);
    });

    timeInputs.forEach((input) => {
      input.addEventListener('input', () => {
        const clean = input.value.replace(/\D/g, '');
        if (clean !== input.value) input.value = clean;
        render(true);
      });

      input.addEventListener('focus', () => setTimeout(() => input.select(), 0));
    });

    distFieldset.addEventListener('focusout', (event) => {
      if (isPressing() || (event.relatedTarget && distFieldset.contains(event.relatedTarget))) return;
      if (event.target !== distInput) return;
      state.touched.add('dist');
      render(false);
    });

    timeFieldset.addEventListener('focusout', (event) => {
      if (isPressing() || (event.relatedTarget && timeFieldset.contains(event.relatedTarget))) return;
      state.touched.add('time');
      render(false);
    });


    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        distInput.value = chip.dataset.dist;
        state.touched.add('dist');
        const result = render(false);
      
        if (!result.ok && timeInputs.every((input) => input.value === '')) minutesInput.focus();
      });
    });

  
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      state.submitted = true;
      const result = render(false);
      if (result.ok) {
      
        box.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
      } else {
        focusFirstProblem(result);
      }
    });

    
    form.addEventListener('reset', () => {
      setTimeout(() => {
        state.submitted = false;
        state.touched.clear();
        setMessage(distMsg, '');
        setMessage(timeMsg, '');
        [distInput, ...timeInputs].forEach((input) => input.removeAttribute('aria-invalid'));
        riegelSwitch.checked = false;
        showEmpty();
        syncChips();
        speak('Calculadora limpa.');
        distInput.focus();
      }, 0);
    });

    
    riegelSwitch.addEventListener('change', () => {
      if (state.last) renderProjections();
    });

    
    $('[data-calc-example]', box).addEventListener('click', () => {
      distInput.value = '5';
      timeInputs[0].value = '';
      minutesInput.value = '28';
      timeInputs[2].value = '3';
      state.submitted = true;
      render(false);
    });


    $$('[data-calc-km]').forEach((link) => {
      link.addEventListener('click', () => {
        distInput.value = link.dataset.calcKm;
        state.touched.add('dist');
        render(false);

        setTimeout(() => minutesInput.focus({ preventScroll: true }), 500);
      });
    });

    chips.forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
  }
  
  function initChart() {
    const root = $('[data-chart]');
    const stage = $('[data-chart-stage]');
    const readout = $('[data-chart-readout]');
    const table = $('[data-chart-data]');
    if (!root || !stage || !readout || !table) return;

    const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  
    const points = $$('tbody tr', table).map((row) => {
      const start = new Date(row.dataset.inicio + 'T12:00:00');
      const end = new Date(start.getTime());
      end.setDate(end.getDate() + 6);
      return {
        km: Number(row.dataset.km),
        label: $('th', row).textContent.trim(),
        
        tick: end.getDate() <= 7 ? MONTHS[end.getMonth()] : ''
      };
    }).filter((point) => Number.isFinite(point.km));
    if (points.length < 2) return;

    const last = points.length - 1;
    const kmText = (km) => Math.round(km) + ' km';   
    let active = last;                                
    let refs = null;                                  
    let drawnWidth = 0;
    let revealed = false;
    const canAnimate = 'IntersectionObserver' in window && !reduceMotion.matches;

    readout.textContent = '';
    const readLabel = document.createElement('span');
    const readValue = document.createElement('span');
    readLabel.className = 'chart__readout-label';
    readValue.className = 'chart__readout-value';
    readout.append(readLabel, readValue);
    stage.setAttribute('aria-valuemax', String(last));

    function svgEl(name, attributes, parent) {
      const node = document.createElementNS(SVG_NS, name);
      Object.keys(attributes || {}).forEach((key) => node.setAttribute(key, attributes[key]));
      if (parent) parent.appendChild(node);
      return node;
    }

    
    function draw() {
      const width = Math.round(stage.clientWidth);
      if (width < 120) return;                       
      drawnWidth = width;

      const height = width < 480 ? 230 : 280;
      const pad = { top: 16, right: 54, bottom: 30, left: 8 };
      const plotWidth = width - pad.left - pad.right;
      const plotHeight = height - pad.top - pad.bottom;

    
      const maxKm = Math.max.apply(null, points.map((point) => point.km));
      const topKm = Math.max(4, Math.ceil(maxKm / 4) * 4);
      const xs = points.map((point, i) => pad.left + (plotWidth * i) / last);
      const ys = points.map((point) => pad.top + plotHeight * (1 - point.km / topKm));
      const baseY = pad.top + plotHeight;

      stage.textContent = '';
      const svg = svgEl('svg', {
        class: 'chart__svg',
        viewBox: '0 0 ' + width + ' ' + height,
        width: width,
        height: height,
        'aria-hidden': 'true',
        focusable: 'false'
      }, stage);

      
      const defs = svgEl('defs', {}, svg);
      const gradient = svgEl('linearGradient', { id: 'chart-area', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      svgEl('stop', { class: 'chart__area-top', offset: 0 }, gradient);
      svgEl('stop', { class: 'chart__area-bottom', offset: 1 }, gradient);

      
      [0, topKm / 2, topKm].forEach((value) => {
        const y = pad.top + plotHeight * (1 - value / topKm);
        svgEl('line', { class: 'chart__grid', x1: pad.left, x2: width - pad.right + 10, y1: y, y2: y }, svg);
        svgEl('text', { class: 'chart__text', x: width, y: y, dy: '.35em', 'text-anchor': 'end' }, svg)
          .textContent = value + ' km';
      });

      
      points.forEach((point, i) => {
        if (!point.tick) return;
        const anchor = i === 0 ? 'start' : (i === last ? 'end' : 'middle');
        svgEl('text', {
          class: 'chart__text',
          x: anchor === 'start' ? xs[i] - 6 : xs[i],
          y: height - 8,
          'text-anchor': anchor
        }, svg).textContent = point.tick;
      });

      
      const lineD = points.map((point, i) => (i ? 'L' : 'M') + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1)).join('');
      const areaD = lineD + 'L' + xs[last].toFixed(1) + ' ' + baseY + 'L' + xs[0].toFixed(1) + ' ' + baseY + 'Z';
      const area = svgEl('path', { class: 'chart__area', d: areaD, fill: 'url(#chart-area)' }, svg);
      const line = svgEl('path', { class: 'chart__line', d: lineD }, svg);

      
      const marks = svgEl('g', { class: 'chart__marks' }, svg);
      const cursor = svgEl('line', { class: 'chart__cursor', y1: pad.top, y2: baseY }, marks);
      points.forEach((point, i) => svgEl('circle', { class: 'chart__pt', cx: xs[i], cy: ys[i], r: 4.5 }, marks));
      const halo = svgEl('circle', { class: 'chart__halo', r: 13 }, marks);
      const dot = svgEl('circle', { class: 'chart__dot', r: 6 }, marks);

      refs = { xs, ys, area, line, marks, cursor, halo, dot };

      
      if (canAnimate && !revealed) {
        line.style.setProperty('--len', Math.ceil(line.getTotalLength()));
        [line, area, marks].forEach((node) => node.classList.add('is-armed'));
      }

      setActive(active);
    }

    function reveal() {
      if (revealed) return;
      revealed = true;
      if (!refs) return;
      [refs.line, refs.area, refs.marks].forEach((node) => {
        node.classList.remove('is-armed');
        node.classList.add('is-drawing');
      });
    }

    
    function setActive(index) {
      active = clamp(index, 0, last);
      const point = points[active];

      readLabel.textContent = 'Semana de ' + point.label;
      readValue.textContent = kmText(point.km);

      stage.setAttribute('aria-valuenow', String(active));
      stage.setAttribute('aria-valuetext', 'Semana de ' + point.label + ': ' + kmText(point.km));

      if (!refs) return;
      const x = refs.xs[active];
      const y = refs.ys[active];
      refs.cursor.setAttribute('x1', x);
      refs.cursor.setAttribute('x2', x);
      [refs.halo, refs.dot].forEach((node) => {
        node.setAttribute('cx', x);
        node.setAttribute('cy', y);
      });
    }

    function nearestIndex(event) {
      const x = event.clientX - stage.getBoundingClientRect().left;
      let best = 0;
      let bestDistance = Infinity;
      refs.xs.forEach((px, i) => {
        const distance = Math.abs(px - x);
        if (distance < bestDistance) { best = i; bestDistance = distance; }
      });
      return best;
    }

    stage.addEventListener('pointerdown', (event) => { if (refs) setActive(nearestIndex(event)); });
    stage.addEventListener('pointermove', (event) => {
      if (refs && (event.pointerType === 'mouse' || event.buttons)) setActive(nearestIndex(event));
    });
    stage.addEventListener('keydown', (event) => {
      const moves = { ArrowLeft: active - 1, ArrowDown: active - 1, ArrowRight: active + 1, ArrowUp: active + 1, Home: 0, End: last };
      if (!(event.key in moves)) return;
      event.preventDefault();
      setActive(moves[event.key]);
    });


    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        if (Math.round(stage.clientWidth) !== drawnWidth) draw();
      }).observe(stage);
    } else {
      window.addEventListener('resize', debounce(draw, 150));
    }

    if (canAnimate) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      }, { threshold: 0.4 });
      observer.observe(stage);
    }

    draw();
    setActive(active);
  }

  function initContactForm() {
    const form = $('#form-contato');
    if (!form) return;

    const submitButton = $('[data-submit]', form);
    const status = $('[data-form-status]', form);
    const counter = $('[data-counter]', form);
    const trap = $('[name="_gotcha"]', form);
    const MAX_MESSAGE = 500;
    const MIN_MESSAGE = 10;
    const isPressing = pressGuard(form);

  
    const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;


    const rules = {
      'contato-nome': (value) => {
        const text = value.trim();
        if (!text) return 'Informe seu nome.';
        if ((text.match(/\p{L}/gu) || []).length < 2) return 'Use pelo menos 2 letras.';
        if (!/^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(text)) return 'Use só letras no nome.';
        return '';
      },
      'contato-email': (value) => {
        const text = value.trim();
        if (!text) return 'Informe seu e-mail.';
        if (!text.includes('@')) return 'Falta o @ no e-mail. Exemplo: nome@email.com.';
        if (!EMAIL.test(text) || text.includes('..') || !/\.[A-Za-z]{2,}$/.test(text)) {
          return 'Esse e-mail parece incompleto. Exemplo: nome@email.com.';
        }
        return '';
      },
      'contato-mensagem': (value) => {
        const text = value.trim();
        if (!text) return 'Escreva sua mensagem.';
        if (text.length < MIN_MESSAGE) return 'Escreva pelo menos ' + MIN_MESSAGE + ' caracteres (faltam ' + (MIN_MESSAGE - text.length) + ').';
        return '';
      }
    };

    const fields = $$('[data-field]', form).map((wrapper) => ({
      wrapper,
      input: $('.field__input', wrapper),
      message: $('[data-msg]', wrapper),
      showingError: false
    }));

  
    function paint(field, kind, text) {
      field.wrapper.classList.toggle('is-valid', kind === 'valid');
      field.wrapper.classList.toggle('is-invalid', kind === 'invalid');
      if (kind === 'invalid') field.input.setAttribute('aria-invalid', 'true');
      else field.input.removeAttribute('aria-invalid');
      setMessage(field.message, kind === 'invalid' ? text : '');
      field.showingError = kind === 'invalid';
    }

    function check(field, mode) {
      const text = rules[field.input.id](field.input.value);
      if (!text) {
        paint(field, 'valid');
        return true;
      }
      if (mode === 'live' && !field.showingError) paint(field, 'neutral');   
      else paint(field, 'invalid', text);
      return false;
    }

    function updateCounter() {
      const length = $('textarea', form).value.length;
      counter.textContent = length + '/' + MAX_MESSAGE;
      counter.classList.toggle('is-near', length >= MAX_MESSAGE * 0.9 && length < MAX_MESSAGE);
      counter.classList.toggle('is-full', length >= MAX_MESSAGE);
    }

    function showStatus(kind, text) {
      status.textContent = '';
      status.className = 'form__status is-' + kind;
      const span = document.createElement('span');
      span.textContent = text;
      status.append(svgIcon(kind === 'success' ? 'i-check' : 'i-alert'), span);
      status.hidden = false;
    }

    function hideStatus() {
      status.hidden = true;
      status.textContent = '';
    }

    function setBusy(busy) {
      submitButton.setAttribute('aria-busy', String(busy));
      submitButton.textContent = busy ? 'Enviando' : 'Enviar mensagem';
    }

    /* --- Eventos dos campos --- */
    fields.forEach((field) => {
      field.input.addEventListener('input', () => {
        if (!status.hidden) hideStatus();
        check(field, 'live');
        if (field.input.tagName === 'TEXTAREA') updateCounter();
      });
      field.input.addEventListener('blur', () => {
        if (isPressing()) return;           
        
        if (field.input.value === '' && !field.showingError) return;
        check(field, 'blur');
      });
    });

    
    let sending = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending) return;

    
      if (trap && trap.value) {
        showStatus('success', 'Mensagem enviada.');
        return;
      }

      const results = fields.map((field) => check(field, 'submit'));
      const firstInvalid = fields.find((field, i) => !results[i]);
      if (firstInvalid) {
        firstInvalid.input.focus();
        showStatus('error', 'Revise os campos marcados e envie de novo.');
        return;
      }

      const endpoint = (form.dataset.endpoint || '').trim();
      const firstName = $('#contato-nome', form).value.trim().split(/\s+/)[0];

      sending = true;
      hideStatus();
      setBusy(true);

      try {
        if (!endpoint) {
          
          await new Promise((resolve) => setTimeout(resolve, 900));
          showStatus('success', 'Mensagem validada, ' + firstName + '! Este site está em modo demonstração, então nada foi enviado.');
        } else {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(form),
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (!response.ok) throw new Error('Resposta ' + response.status);
          showStatus('success', 'Mensagem enviada, ' + firstName + '! Respondo assim que puder.');
        }
        form.reset();
        fields.forEach((field) => paint(field, 'neutral'));
        updateCounter();
      } catch (error) {
        showStatus('error', 'O envio falhou. Confira sua conexão e tente de novo.');
      } finally {
        sending = false;
        setBusy(false);
      }

      status.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
    });

    updateCounter();
  }


 
  function initMisc() {
    
    $$('[data-year]').forEach((element) => { element.textContent = String(new Date().getFullYear()); });

    
    Object.keys(LINKS).forEach((name) => {
      if (!LINKS[name]) return;
      $$('[data-social="' + name + '"]').forEach((anchor) => { anchor.href = LINKS[name]; });
    });
  }


  [initMisc, initHeader, initFilters, initTabs, initCalculator, initChart, initContactForm].forEach((init) => {
    try {
      init();
    } catch (error) {
      console.error('[CorredorDev] falha em ' + init.name + ':', error);
    }
  });
})();
