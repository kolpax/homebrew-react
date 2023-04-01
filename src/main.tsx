import './style.css';

interface Element {
  tagName: string;
  props?: {};
  children?: (Element | string)[];
}

const React = {
  createElement<T extends {}>(componentOrTagName: string | ((props: T) => Element), props: T, ...children: Element[]): Element {
    // Extract key from props
    if (props && typeof props === 'object' && "key" in props) {
      delete props.key;
    }

    if (typeof componentOrTagName === 'string') {
      return { tagName: componentOrTagName, props, children: (children ?? []).flat() };
    } else {
      return componentOrTagName({ ...props, children });
    }
  },
};

function encodeHtml(str: string): string {
  return str.replace(/</g, "&lt;").replace(/\u00A0/g, "&nbsp;");
}

function renderToHtmlString(element: Element | string): string {
  (window as any).__currentElementKey__++;

  if (typeof element === 'string') {
    return encodeHtml(element);
  }

  return `<${element.tagName} ${toHtmlAttributeString(element.props ?? {})}>${(element.children ?? []).map((child) => renderToHtmlString(child)).join("")}</${element.tagName}>`;
}

function toHtmlAttributeString(props: Record<string, any>) {
  return Object.keys(props).map(k => {
    if (k === "style") {
      // backgroundColor turns into background-color
      const styleProps = Object.keys(props[k]).map((sk) => {
        return `${sk.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}: ${props[k][sk]}`;
      });

      return `style="${styleProps.join("; ")}"`;
    }

    if (k === "className") {
      return `class="${props[k]}"`;
    }

    if (k.startsWith("on") && typeof props[k] === "function") {
      const eventType = k.slice(2).toLowerCase();
      const keyValue = `_event${Math.random().toString().replace(".", "")}`;
      (window as any)[keyValue] = function (event: Event) {
        props[k](event);
        event.preventDefault();
        return false;
      };
      return `on${eventType}="${keyValue}(event)"`;
    }

    return `${k}="${props[k]}"`;
  }).join(" ");
}

function render(rootSelector: string, node: () => Element) {
  (window as any)._$$lib_notifyObservers$$ = function () {
    renderInner(rootSelector, node);
  }

  renderInner(rootSelector, node);
}

function renderInner(rootSelector: string, node: () => Element) {
  (window as any).__currentElementKey__ = 0;
  document.querySelector<HTMLDivElement>(rootSelector)!.innerHTML = renderToHtmlString(node());
  delete (window as any).__currentElementKey__;
}

function observe<T extends object>(initialValue: T): T {
  const key = (window as any).__currentElementKey__;
  const observers = (window as any)["__observers__"] = (window as any)["__observers__"] ?? (() => {
    const newMap = new Map();

    newMap.set(key, initialValue);

    return newMap;
  })();

  return new Proxy<T>(initialValue, {
    set(_target: T, property: string, newValue: any) {
      const state = observers.get(key);

      state[property] = newValue;

      (window as any)._$$lib_notifyObservers$$();

      return true;
    },
    get(_target: T, property: string) {
      const state = observers.get(key);

      return state[property];
    }
  }) as T;
}

interface HeadingProps {
  title?: string;
}

function Heading(props: HeadingProps) {
  return (
    <h1>{props.title ?? "<Untitled>"}</h1>
  );
}

const names = ["Wonjae", "foo", "bar"];

const Root = () => {
  const state = observe({ counter: 0 });

  return (
    <div title="Hello">
      <span className="thing" style={{ backgroundColor: "#bada55", padding: "5px" }} onClick={() => { state.counter = state.counter + 1 }}>content {names[2]}</span>
      <Heading title={`State: ${state.counter}`} />
      <Heading />
      {names.map((name) => <h2 key={name}>{name}</h2>)}
    </div>
  );
};

render("#app", () => <Root />);
