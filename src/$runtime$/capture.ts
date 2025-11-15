// start snip by clicking on extension icon // @ts-ignore
/*
chrome.action.onClicked.addListener(async (tab) => {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            files: ["contentScript.js"]
        });
        // tell content script to start selection mode
        chrome.tabs.sendMessage(tab.id!, { type: "START_SNIP" });
    } catch (e) {
        console.error("Injection failed:", e);
    }
});*/

//
import { encodeWithJSquash } from "../$utils$/compress";
import { recognizeImage } from "./api";

//
const removeAnyDataPrefix = (b64url: string) => {
    return b64url?.replace?.('data:image/png;base64,', "")?.replace?.(/data:image\/jpeg;base64,/, "");
}

//
const getMimeFromDataURL = (data_url: string) => {
    return data_url?.match?.(/data:image\/(.*);base64,/)?.[1] || "image/png";
}

//
const ableToShowImage = async (data_url: string) => { // @ts-ignore
    const bitmap: any = await createImageBitmap(new Blob([Uint8Array.fromBase64(removeAnyDataPrefix(data_url), { alphabet: "base64" })], { type: getMimeFromDataURL(data_url) }))?.catch?.(e => { console.warn(e); return null; });
    return bitmap?.width > 0 && bitmap?.height > 0;
}



//
export async function createOffscreen() {
    if (await chrome.offscreen.hasDocument()?.catch?.(console.warn.bind(console))) return;
    await chrome.offscreen.createDocument({
        url: 'src/$offscreen$/copy.html',
        reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification: 'Use clipboard API'
    })?.catch?.(console.warn.bind(console));
}

//
//
const COPY_HACK = (ext, data, tabId?) => {
/*
await createOffscreen();
return chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'COPY_HACK',
    ...data
});*/

    return ext.tabs.query({
        currentWindow: true,
        lastFocusedWindow: true,
        active: true,
    })?.then?.((tabs)=>{
        for (const tab of tabs) {
            if (tab?.id != null && tab?.id >= 0) {
                //ctxAction({"type": info.menuItemId}, null, ()=>{});
                return chrome.tabs.sendMessage?.(tab.id, { type: "COPY_HACK", ...data })?.catch?.(console.warn.bind(console));
            }
        }
    })?.catch?.(console.warn.bind(console));

    //
    if (tabId != null && tabId >= 0) { return chrome.tabs.sendMessage?.(tabId, { type: "COPY_HACK", ...data })?.catch?.(console.warn.bind(console)); }
}

//
const deAlphaChannel = async (src: string) => {
    //if (URL.canParse(src)) return src;

    //
    const img = new Image();
    {
        img.crossOrigin = "Anonymous";
        img.decoding = "async";
        img.src = src;
        await img.decode();
    }

    //
    const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
    const ctx = canvas.getContext("2d");
    ctx!.fillStyle = "white";
    ctx?.fillRect(0, 0, canvas.width, canvas.height);
    ctx?.drawImage(img, 0, 0);
    const imgData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    const arrayBuffer = await encodeWithJSquash(imgData);

    // @ts-ignore
    return arrayBuffer ? `data:image/jpeg;base64,${new Uint8Array(arrayBuffer)?.toBase64?.({ alphabet: "base64" })}` : null;
}



// service worker makes screenshot of visible area
export const enableCapture = (ext) => {
    ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg?.type === "CAPTURE") {
            const windowId = sender?.tab?.windowId; //@ts-ignore
            chrome.tabs.captureVisibleTab({ format: "png", scale: 1, rect: msg.rect ?? {x: 0, y: 0, width: 0, height: 0} }, async ($dataUrl) => { // @ts-ignore
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    sendResponse({ ok: false, error: chrome.runtime.lastError.message, dataUrl: $dataUrl });
                } else {
                    // may be too large, try to compress
                    let dataUrl = $dataUrl;
                    if (dataUrl.length > 1024 * 1024 * 2) {
                        dataUrl = (await deAlphaChannel(dataUrl)) ?? dataUrl;

                        // @ts-ignore
                        const bitmap = await createImageBitmap(new Blob([Uint8Array.fromBase64(removeAnyDataPrefix(dataUrl), { alphabet: "base64" })], { type: getMimeFromDataURL(dataUrl) })/*, rect.x, rect.y, rect.width, rect.height*/);
                        const arrayBuffer = await encodeWithJSquash(bitmap)?.catch?.(e => { console.warn(e); return null; }); bitmap?.close?.(); // @ts-ignore
                        dataUrl = arrayBuffer ? `data:image/jpeg;base64,${new Uint8Array(arrayBuffer)?.toBase64?.({ alphabet: "base64" })}` : $dataUrl;
                    }

                    //
                    if (!dataUrl || !(await ableToShowImage(dataUrl))) {
                        dataUrl = $dataUrl;
                    }

                    //
                    const res = await recognizeImage({ //@ts-ignore
                        //type: "gpt:recognize",
                        input: [{
                            role: "user",
                            content: [ //@ts-ignore
                                { type: "input_image", image_url: dataUrl, detail: "auto" }
                            ]
                        }]
                    });

                    //
                    if (res?.ok) {
                        await COPY_HACK(ext, {
                            data: res?.data?.output?.at?.(-1)?.content?.[0]?.text?.trim?.(),
                            ok: res?.ok,
                            error: res?.error
                        }, sender?.tab?.id)?.catch?.(console.warn.bind(console));
                    }

                    //
                    sendResponse(res); //return res;
                }
            });
        }

        //
        if (msg?.type === "DOWNLOAD" && msg.dataUrl) {
            chrome.downloads.download(
                { url: msg.dataUrl, filename: "snip.png", saveAs: true },
                (id) => { // @ts-ignore
                    if (chrome.runtime.lastError) {
                        sendResponse({ ok: false, error: chrome.runtime.lastError.message, dataUrl: msg.dataUrl });
                    } else {
                        sendResponse({ ok: true, id });
                    }
                }
            );
        }
        return true;
    });
}
