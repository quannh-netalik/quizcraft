export type RenderMarkdown = (markdown: string, element: HTMLElement) => void;

export type RendererContext = {
  host: HTMLElement;
  renderMarkdown: RenderMarkdown;
  stateChanged: () => void;
  rerender: () => void;
};

export type RendererCleanup = () => void;
