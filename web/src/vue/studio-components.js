import { h, Fragment, Transition } from '../../vendor/vue/vue.runtime.esm-browser.prod.js';
import { panels } from './studio-state.js';

const icon = name => h('svg', { 'aria-hidden': 'true' }, [h('use', { href: `#icon-${name}` })]);
const caption = (key, text, tag = 'span', props = {}) => h(Transition, { name: 'vue-caption', onBeforeLeave: el => el.setAttribute('aria-hidden', 'true') },
  { default: () => h(tag, { ...props, key }, text) });

export function createComponents(controller) {
  const { state, selectPanel, setDay, togglePlay } = controller;
  const navigation = [
    ['教学空间', [['showcase.html', 'grid', '演示总览'], ['index.html', 'body', '三维教学'],
      ['structure.html', 'cube', '人体结构'], ['yangqi.html', 'sun', '阳气运行'], ['dataset.html', 'chart', '数据推演']]],
    ['资料与教研', [['herbs.html', 'leaf', '药材资料'], ['teacher.html', 'book', '教师端'],
      ['research.html', 'check', '研究模式'], ['judge.html#defense-workbench', 'arrow', '答辩任务台']]],
  ];
  const Sidebar = { name: 'StudioSidebar', setup: () => () => h(Fragment, null, [
    h('a', { class: 'studio-brand', href: 'showcase.html' }, [h('span', { class: 'studio-mark' }, '络'),
      h('span', null, [h('strong', '络象经纬'), h('small', 'LUOXIANG · TCM')])]),
    ...navigation.flatMap(([label, links]) => [h('div', { class: 'nav-section-label' }, label),
      h('nav', { class: 'studio-nav-links', 'aria-label': label }, links.map(([href, name, text]) =>
        h('a', { href, key: href, 'aria-current': href === 'index.html' ? 'page' : undefined },
          [icon(name), h('span', text), href === 'index.html' ? h('i') : null])))]),
    h('div', { class: 'sidebar-note' }, [h('div', { class: 'sidebar-privacy' }, [h('span', { class: 'local-dot' }), '本地处理 · 不上传作答']),
      h('small', '观其形，循其络；让结构可见，让教学有据。')]),
  ]) };
  const Workflow = { name: 'StudioWorkflow', setup: () => () => h(Fragment, null,
    panels.flatMap((panel, i) => [i ? h('i', { 'aria-hidden': 'true' }) : null,
      h('button', { type: 'button', class: ['workflow-step', { 'is-current': state.panel === panel.id }],
        'data-workflow-step': panel.id, 'aria-current': state.panel === panel.id ? 'step' : undefined,
        onClick: () => selectPanel(panel.id) }, [h('b', `0${i + 1}`), h('span', panel.step)])])) };
  const Tabs = { name: 'StudioTabs', setup: () => () => h(Fragment, null, [
    h('span', { class: 'vue-tab-indicator', 'aria-hidden': 'true', style: { transform: `translateX(${panels.findIndex(p => p.id === state.panel) * 100}%)` } }),
    ...panels.map((panel, i) => h('button', { key: panel.id, id: `tab-${panel.id}`, type: 'button', role: 'tab',
      'aria-controls': `panel-${panel.id}`, 'aria-selected': String(state.panel === panel.id),
      tabindex: state.panel === panel.id ? 0 : -1, 'data-studio-tab': panel.id,
      onClick: () => selectPanel(panel.id), onKeydown: event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + panels.length) % panels.length;
        selectPanel(panels[index].id, true);
      } }, panel.label)),
  ]) };
  const Heading = { name: 'StudioHeading', setup: () => () => h(Fragment, null, [
    h('div', { class: 'vue-heading-caption' }, [h('span', '教学观察'),
      h('h2', { id: 'inspector-title' }, [caption(state.panel, panels.find(p => p.id === state.panel).title)])]),
    h('span', { id: 'inspector-step', class: 'inspector-step' }, `0${panels.findIndex(p => p.id === state.panel) + 1} / 03`),
  ]) };
  const Timeline = { name: 'StudioTimeline', setup: () => () => h(Fragment, null, [
    h('button', { id: 'stage-play', type: 'button', disabled: !state.enabled,
      'aria-label': state.playing ? '暂停教学变化' : '播放教学变化', onClick: togglePlay },
      [h('span', { class: 'vue-play-icon', 'aria-hidden': 'true' }, state.playing ? 'Ⅱ' : '▶'), state.playing ? '暂停' : '播放']),
    h('div', { class: 'stage-range' }, [h('div', { class: 'stage-range-head' }, [
      h('span', [state.pattern ? `观察：${state.pattern}` : '教学时间轴', h('small', '规则模拟，非疗效预测')]),
      h('b', { id: 'stage-day-label' }, `第 ${state.day} 天`)]),
    h('input', { id: 'stage-day-slider', type: 'range', min: 0, max: 28, step: 1,
      value: state.day, disabled: !state.enabled, 'aria-label': '教学时间轴天数',
      'aria-valuetext': `第 ${state.day} 天，教学模拟`,
      style: { '--vue-progress': `${state.day / 28 * 100}%` }, onInput: event => setDay(event.target.value) }),
    h('div', { class: 'stage-ticks' }, [h('span', '第 0 天'), h('span', '7 天'), h('span', '14 天'), h('span', '28 天')]),
    ]),
  ]) };
  const Feedback = { name: 'StudioFeedback', setup: () => () => h(Transition, { name: 'vue-feedback', mode: 'out-in' },
    { default: () => state.message ? h('div', { key: 'active-feedback', class: 'vue-feedback', role: 'status' },
      [h('i', { 'aria-hidden': 'true' }), state.message]) : null }) };
  return { Sidebar, Workflow, Tabs, Heading, Timeline, Feedback };
}
