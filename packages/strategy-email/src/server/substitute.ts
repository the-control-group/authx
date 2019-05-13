function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(unsafe: string): string {
  return unsafe.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

export function substitute(
  map: { [key: string]: string },
  template: string
): string {
  let result = template;
  Object.keys(map).forEach(key => {
    result = result
      .replace(new RegExp(escapeRegExp(`{{{${key}}}}`), "g"), map[key])
      .replace(
        new RegExp(escapeRegExp(`{{${key}}}`), "g"),
        escapeHtml(map[key])
      );
  });

  return result;
}
