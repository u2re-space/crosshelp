import { coordinate, lastElement } from "./state";

// @ts-ignore
export const ext: any = typeof chrome != 'undefined' ? chrome : (typeof browser != 'undefined' ? browser : self);

//
export const dummy = (unsafe)=>{
    return (unsafe?.trim()?.replace?.(/&amp;/g, '&')
        ?.replace?.(/&lt;/g, '<')
        ?.replace?.(/&gt;/g, '>')
        ?.replace?.(/&quot;/g, '"')
        ?.replace?.(/&nbsp;/g, " ")
        ?.replace?.(/&#39;/g, "'") || unsafe)?.trim?.();
}

//
export const weak_dummy = (unsafe)=>{
    return (unsafe?.trim()?.replace?.(/&amp;/g, '&')
        ?.replace?.(/&nbsp;/g, " ")
        ?.replace?.(/&quot;/g, '"')
        ?.replace?.(/&#39;/g, "'") || unsafe)?.trim?.();
}

//
export const tryXML = (unsafe: string): string => {
    const doc = new DOMParser().parseFromString(unsafe?.trim?.(), "text/xml");
    if (doc?.querySelector("parsererror") || !doc) {
        return (dummy(unsafe) || unsafe)?.trim?.();
    };
    return (weak_dummy(doc?.documentElement?.textContent) || dummy(unsafe) || unsafe)?.trim?.();
}

//
export const serialize = (xml: any): string => {
    const s = new XMLSerializer();
    return (typeof xml == "string" ? xml : xml?.outerHTML || s.serializeToString(xml))?.trim?.();
}

//
export const escapeML = (unsafe: string): string => {
    if (/&amp;|&quot;|&#39;|&lt;|&gt;|&nbsp;/.test(unsafe.trim())) {
        if (unsafe?.trim()?.startsWith?.("&lt;") && unsafe?.trim()?.endsWith?.("&gt;")) {
            return (tryXML(unsafe) || dummy(unsafe) || unsafe)?.trim?.();
        }
        if (!(unsafe?.trim()?.startsWith?.("<") && unsafe?.trim()?.endsWith?.(">"))) {
            return (dummy(unsafe) || unsafe)?.trim?.();
        }
    }
    return (weak_dummy(unsafe) || unsafe)?.trim?.();
}

// such as ChatGPT
export const extractFromAnnotation = (math: any): string =>{
    if (!math.matches(".katex math, math.katex")) return "";
    const A = math?.querySelector?.("annotation");
    const C = (A.textContent || "")?.trim?.();
    const Q = (C.replace(/^["'](.+(?=["']$))["']$/, '$1') || (C || ""))?.trim?.();
    return (escapeML(Q) || Q)?.trim?.();
}

//
export const bySelector = (target: HTMLElement, selector: string): HTMLElement | null =>{
    return (target.matches(selector) ? target : (target.closest(selector) ?? target.querySelector(selector)))
}

//
export const getContainerFromTextSelection = (target: HTMLElement = document.body): HTMLElement | null =>{
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const node = range.commonAncestorContainer;
        if (node.nodeType == Node.ELEMENT_NODE || node instanceof HTMLElement) return node as HTMLElement;
        if (node.parentElement) return node.parentElement;
    }
    const element = lastElement?.[0] || document.elementFromPoint(...coordinate);
    if (element) return element as HTMLElement;
    return target;
}
