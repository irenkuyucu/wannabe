import { afterEach } from "node:test";

import { cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";

let installed = false;

export function setupReactTestEnv() {
  if (!installed) {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/",
    });
    const { window } = dom;
    const globalScope = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
      cancelAnimationFrame?: (handle: number) => void;
      requestAnimationFrame?: (callback: FrameRequestCallback) => number;
    };

    globalThis.window = window as unknown as typeof globalThis.window;
    globalThis.document = window.document;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: window.navigator,
    });
    globalThis.HTMLElement = window.HTMLElement;
    globalThis.Element = window.Element;
    globalThis.Node = window.Node;
    globalThis.SVGElement = window.SVGElement;
    globalThis.getComputedStyle = window.getComputedStyle.bind(window);
    globalScope.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(Date.now()), 16);
    globalScope.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
    globalScope.IS_REACT_ACT_ENVIRONMENT = true;

    installed = true;
  }

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });
}
