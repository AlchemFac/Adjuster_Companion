
'use strict';
// Reference only: no task, completion or persistent state is created here.
{
  let heading;
  let list;
  for (const [, section, title, hint, routine] of DAY_ONE_STEPS) {
    if (heading !== section) {
      heading = section;
      const group = document.createElement('section');
      const header = document.createElement('h3'); header.textContent = section;
      list = document.createElement('ul'); group.append(header, list);
      document.querySelector('#day-one-list').append(group);
    }
    const item = document.createElement('li'); item.className = 'day-one-step';
    const label = document.createElement('strong'); label.textContent = title;
    const detail = document.createElement('p'); detail.className = 'muted'; detail.textContent = hint;
    const applicability = document.createElement('small'); applicability.textContent = routine ? 'Routine review reference' : 'When applicable';
    item.append(label, detail, applicability); list.append(item);
  }
}
