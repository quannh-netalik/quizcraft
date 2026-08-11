function installObsidianDom(window) {
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  global.HTMLButtonElement = window.HTMLButtonElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.Event = window.Event;

  const prototype = window.HTMLElement.prototype;
  const applyOptions = (element, options = {}) => {
    if (options.cls) element.className = options.cls;
    if (options.text !== undefined) element.textContent = options.text;
    for (const [name, value] of Object.entries(options.attr ?? {})) element.setAttribute(name, value);
    return element;
  };

  prototype.createEl = function createEl(tag, options) {
    const element = applyOptions(window.document.createElement(tag), options);
    this.appendChild(element);
    return element;
  };
  prototype.createDiv = function createDiv(options) {
    return this.createEl("div", options);
  };
  prototype.createSpan = function createSpan(options) {
    return this.createEl("span", options);
  };
  prototype.addClass = function addClass(name) {
    this.classList.add(name);
  };
  prototype.removeClass = function removeClass(name) {
    this.classList.remove(name);
  };
  prototype.toggleClass = function toggleClass(name, active) {
    this.classList.toggle(name, active);
  };
  prototype.hasClass = function hasClass(name) {
    return this.classList.contains(name);
  };
  prototype.setText = function setText(value) {
    this.textContent = value;
  };
}

module.exports = { installObsidianDom };
