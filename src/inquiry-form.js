export const inquiryFields = ['name', 'reply', 'project', 'location', 'description'];

export async function mountInquiry(container, locale, copy) {
  try {
    const response = await fetch('/api/inquiry', { headers: { Accept: 'application/json' } });
    if (!response.ok || !(await response.json()).available) return;
  } catch {
    return;
  }
  const form = document.createElement('form');
  form.className = 'inquiry-form';
  form.noValidate = true;
  form.setAttribute('aria-labelledby', 'inquiry-title');
  const heading = document.createElement('h3');
  heading.id = 'inquiry-title';
  heading.textContent = copy.title;
  const fields = document.createElement('div');
  fields.className = 'inquiry-fields';
  inquiryFields.forEach((name, index) => {
    const label = document.createElement('label');
    label.htmlFor = 'inquiry-' + name;
    const title = document.createElement('span');
    title.textContent = copy.fields[index];
    const field = document.createElement(name === 'project' ? 'select' : name === 'description' ? 'textarea' : 'input');
    field.id = label.htmlFor;
    field.name = name;
    field.required = true;
    if (field instanceof HTMLSelectElement) {
      field.append(new Option(copy.choose, ''), ...copy.types.map((value, index) => new Option(value, String(index))));
    } else {
      field.maxLength = { name: 100, reply: 140, location: 150, description: 2000 }[name];
      if (field instanceof HTMLTextAreaElement) field.rows = 5;
      if (name === 'name') field.autocomplete = 'name';
      if (name === 'reply') field.dir = 'ltr';
    }
    const message = document.createElement('span');
    message.id = field.id + '-error';
    message.className = 'field-error';
    message.hidden = true;
    field.setAttribute('aria-describedby', message.id);
    label.append(title, field, message);
    fields.append(label);
  });
  const honeypot = document.createElement('input');
  honeypot.type = 'text';
  honeypot.name = 'website';
  honeypot.autocomplete = 'off';
  honeypot.tabIndex = -1;
  honeypot.hidden = true;
  const submit = document.createElement('button');
  submit.className = 'button primary';
  submit.type = 'submit';
  submit.textContent = copy.send;
  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  form.append(heading, fields, honeypot, submit, status);
  container.replaceChildren(form);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const values = { ...Object.fromEntries(new FormData(form)), locale };
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    form.querySelectorAll('span.field-error').forEach(message => { message.setAttribute('hidden', ''); });
    status.classList.remove('form-error');
    status.textContent = copy.pending;
    submit.disabled = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12500);
    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(values),
        signal: controller.signal,
      });
      const result = await response.json();
      if (response.ok && result.accepted === true) {
        form.reset();
        status.textContent = copy.ok;
      } else if (response.status === 422 && Array.isArray(result.fields)) {
        let firstInvalid;
        for (const name of result.fields) {
          const index = inquiryFields.indexOf(name);
          if (index === -1) continue;
          const field = form.elements.namedItem(name);
          if (!(field instanceof HTMLElement)) continue;
          field.setAttribute('aria-invalid', 'true');
          const message = document.getElementById(field.id + '-error');
          message.hidden = false;
          message.textContent = copy.invalid[index];
          firstInvalid ??= field;
        }
        status.textContent = '';
        firstInvalid?.focus();
      } else {
        status.classList.add('form-error');
        status.textContent = response.status === 429 ? copy.limit : copy.error;
      }
    } catch {
      status.classList.add('form-error');
      status.textContent = copy.error;
    } finally {
      clearTimeout(timer);
      submit.disabled = false;
    }
  });
}
