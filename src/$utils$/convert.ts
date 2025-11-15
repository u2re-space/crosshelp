import TurndownService from 'turndown';
import markedKatex from "marked-katex-extension";
import temml from "temml";

//
import { marked } from 'marked';
import { escapeML, bySelector, serialize, extractFromAnnotation, getContainerFromTextSelection } from './core';
import { MathMLToLaTeX } from 'mathml-to-latex';
import { encodeWithJSquash } from './compress';

//
const turndownService = new TurndownService();

//
try {
    marked?.use?.(markedKatex?.({
        throwOnError: false,
        nonStandard: true
    }));
} catch(e) {
    console.warn(e);
}

// convert markdown text to html
export const convertToHtml = async (input: string): Promise<string> => { // convert markdown text to html
    const original = escapeML(input);
    // if already html, don't convert
    if (input?.trim()?.startsWith?.("<") && input?.trim()?.endsWith?.(">")) {
        return input;
    }
    try {
        // marked is synchronous, but we keep async for compatibility
        input = escapeML(await marked.parse(input) || "") || input;
    } catch (e) {
        input = "";
        console.warn(e);
    }
    input ||= original;
    return (input?.normalize?.()?.trim?.() || input?.trim?.() || input);
};

// convert html DOM to markdown
export const convertToMarkdown = (input: string): string => { // convert html DOM to markdown
    const original = escapeML(input);
    try {
        input = turndownService.turndown(input);
    } catch (e) {
        input = "";
        console.warn(e);
    }
    input ||= original;
    return (input?.normalize?.()?.trim?.() || input?.trim?.() || input);
};

// copy html DOM as markdown
export const copyAsMarkdown = async (target: HTMLElement)=>{ // copy html DOM as markdown
    const container = getContainerFromTextSelection(target);
    const markdown = convertToMarkdown(container?.innerHTML || container?.outerHTML || "");
    if (markdown?.trim()) { navigator.clipboard.writeText(markdown?.trim?.()?.normalize?.()?.trim?.() || markdown?.trim?.() || markdown); }
}

// copy markdown text as html
export const copyAsHTML = async (target: HTMLElement)=>{ // copy markdown text as html
    const container = getContainerFromTextSelection(target);
    const html = await convertToHtml(container?.innerText || "") || await convertToHtml(container?.innerHTML || container?.outerHTML || "");
    if (html?.trim()) { navigator.clipboard.writeText(html?.trim?.()?.normalize?.()?.trim?.() || html?.trim?.() || html); }
}

//
const $wrap$ = (katex: string)=>{
    if (katex?.startsWith?.("$") && katex?.endsWith?.("$")) {
        return katex;
    }
    return "$"+katex+"$";
}

// copy mathml DOM as tex
// TODO! support AI recognition and conversion (from images)
export const copyAsTeX = async (target: HTMLElement)=>{
    const math = bySelector(target, "math");
    const mjax = bySelector(target, "[data-mathml]");
    const orig = bySelector(target, "[data-original]");
    const expr = bySelector(target, "[data-expr]");
    const img  = bySelector(target, ".mwe-math-fallback-image-inline[alt], .mwe-math-fallback-image-display[alt]");
    const forRecognition: any = bySelector(target, "img:is([src],[srcset]), picture:has(img)");

    //
    let LaTeX = img?.getAttribute("alt") || getSelection()?.toString?.() || "";

    //
    try {
        if (!LaTeX) { const ml = expr?.getAttribute("data-expr") || ""; LaTeX = (ml ? escapeML(ml) : LaTeX) || LaTeX; }
        if (!LaTeX) { const ml = orig?.getAttribute("data-original") || ""; LaTeX = (ml ? escapeML(ml) : LaTeX) || LaTeX; }
        if (!LaTeX) { const ml = mjax?.getAttribute("data-mathml") || ""; LaTeX = (ml ? escapeML(ml) : LaTeX) || LaTeX; }
        if (!LaTeX) {
            const st = math?.innerHTML || math?.outerHTML || "";
            if (!st && math) {
                // @ts-ignore
                const str = serialize(math);
                LaTeX = escapeML(str || st || LaTeX);
            }
            if (st) { LaTeX = escapeML(st || LaTeX); };
            LaTeX = extractFromAnnotation(math) || LaTeX;
        };
    } catch (e) {
        console.warn(e);
    }

    //
    const original = LaTeX?.trim?.();
    try { LaTeX = MathMLToLaTeX.convert(LaTeX); } catch (e) { LaTeX = ""; console.warn(e); }
    LaTeX ||= original?.trim?.();

    // try AI recognition if is image with URL in src or srcset
    if (!LaTeX && forRecognition) {
        const img = new URL(forRecognition?.currentSrc || forRecognition?.src || forRecognition?.getAttribute?.("src"), window?.location?.origin)?.href;
        const dataUrl = img;
        if (dataUrl) {
            const res = await chrome.runtime.sendMessage({
                type: "gpt:recognize",
                input: [{
                    role: "user",
                    content: [
                        { type: "input_image", image_url: dataUrl, detail: "auto" }
                    ]
                }]
            });
            LaTeX = res?.data?.output?.at?.(-1)?.content?.[0]?.text || LaTeX;
        }
    }

    //
    const resultText = $wrap$(LaTeX?.trim?.()?.normalize?.()?.trim?.() || LaTeX?.trim?.());
    if (resultText) { navigator.clipboard.writeText(resultText)?.catch?.((e) => { console.warn(e); }); }
    return resultText?.trim?.();
}

//
function stripMathDelimiters(input) {
    const s = String(input).trim();

    // Альтернация для разных парных делимитеров:
    // 1: $$ ... $$
    // 2: $  ... $
    // 3: \[ ... \]
    // 4: \( ... \)
    // 5: \begin{name} ... \end{name}
    const re = /^\s*(?:\$\$([\s\S]*?)\$\$|\$([\s\S]*?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\\begin\{([^\}]+)\}([\s\S]*?)\\end\{\5\})\s*$/;

    const m = s.match(re);
    if (!m) return s; // нет внешних делимитеров — вернём строку (trimmed)
    // вернуть первую непустую захваченную группу (т.е. содержимое)
    return (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[6] ?? "").trim();
}

// copy mathml DOM as mathml
// TODO! support AI recognition and conversion (from images)
export const copyAsMathML = async (target: HTMLElement)=>{ // copy mathml DOM as mathml
    const math = bySelector(target, "math");
    const mjax = bySelector(target, "[data-mathml]");
    const orig = bySelector(target, "[data-original]");
    const expr = bySelector(target, "[data-expr]");
    const img = bySelector(target, ".mwe-math-fallback-image-inline[alt], .mwe-math-fallback-image-display[alt]");

    //
    let mathML = (img?.getAttribute?.("alt") || "" || "")?.trim?.();

    //
    try {
        if (!mathML) {
            // @ts-ignore
            const st = (math?.innerHTML || math?.outerHTML || "")?.trim?.();
            if (!st && math) {
                // @ts-ignore
                const str = serialize(math);
                mathML = escapeML(str || st || mathML)?.trim?.();
            }
            if (st) { mathML = escapeML(st || mathML)?.trim?.(); };
        }
        if (!mathML) { const ml = mjax?.getAttribute("data-mathml") || ""; mathML = (ml ? escapeML(ml) : mathML) || mathML; }
        if (!mathML) { const ml = expr?.getAttribute("data-expr") || ""; mathML = (ml ? escapeML(ml) : mathML) || mathML; }
        if (!mathML) { const ml = orig?.getAttribute("data-original") || ""; mathML = (ml ? escapeML(ml) : mathML) || mathML; }
    } catch (e) {
        console.warn(e);
    }

    //
    const original = mathML?.trim?.(); // try use KaTeX, and after re-render as MathML
    if (!mathML) { mathML ||= (await copyAsTeX(target))?.trim?.() || original; }

    //
    if (!(mathML?.trim()?.startsWith?.("<") && mathML?.trim()?.endsWith?.(">"))) {
        try {
            mathML = escapeML(temml.renderToString(stripMathDelimiters(mathML), {
                throwOnError: true,
                strict: false,
                trust: true,
                xml: true
            }) || "")?.trim?.() || mathML;
        } catch (e) { mathML = ""; console.warn(e); }
    }

    //
    mathML ||= original?.trim?.();
    if (mathML?.trim()) { navigator.clipboard.writeText(mathML?.trim?.()?.normalize?.()?.trim?.() || mathML?.trim?.() || mathML)?.catch?.((e)=> { console.warn(e); }); }
    return mathML?.trim?.();
}
