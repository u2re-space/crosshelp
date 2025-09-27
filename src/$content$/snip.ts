import type { cropArea } from "../$utils$/compress";
import { box, hideSelection, hint, selDom, showSelection, showToast, sizeBadge } from "../$overlay$/sel-dom";

//
let __snipInjected = false;
let __snipActive = false;

// use chrome API to capture tab visible area
const captureTab = (rect?: cropArea) => { // @ts-ignore
    return chrome.runtime.sendMessage({ type: "CAPTURE", rect })?.then?.(res => {
        showToast(res?.ok ? "Copying is done" : (res?.error || "Failed to copy"));
        return (res || { ok: false, error: "no response" });
    })?.catch?.(err => console.warn(err));
}

//
export const startSnip = (() => { // @ts-ignore
    if (__snipInjected) return;
    __snipInjected = true;

    //
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === "START_SNIP") startSnip();
    });

    //
    function startSnip() {
        if (__snipActive) return;
        let startX = 0, startY = 0, currX = 0, currY = 0, dragging = false;

        //
        const onKeyDown = (e) => { if (e.key === "Escape") cleanup(); };
        const onMouseDown = (e) => {
            if (e.button !== 0 || !__snipActive) return;
            e.preventDefault();
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            currX = startX;
            currY = startY;
            updateBox();

            // hide hint when process begin
            hint.textContent = "";
            sizeBadge.textContent = "";

            //
            document.addEventListener("mousemove", onMouseMove, true);
            document.addEventListener("mouseup", onMouseUp, true);
            document.addEventListener("mousecancel", onMouseCancel, true);
        };

        //
        const onMouseMove = (e) => {
            if (!dragging) return;
            currX = e.clientX;
            currY = e.clientY;
            updateBox();
        };

        //
        const onMouseCancel = () => {
            if (!dragging) return; dragging = false;
            document.removeEventListener("mousemove", onMouseMove, true);
            document.removeEventListener("mouseup", onMouseUp, true);
            document.removeEventListener("mousecancel", onMouseCancel, true);
            cleanupOverlayKeepFlag();
        };

        //
        const onMouseUp = async () => {
            if (!dragging) return; dragging = false;
            document.removeEventListener("mousemove", onMouseMove, true);
            document.removeEventListener("mouseup", onMouseUp, true);
            document.removeEventListener("mousecancel", onMouseCancel, true);

            //
            const x = Math.min(startX, currX);
            const y = Math.min(startY, currY);
            const w = Math.abs(currX - startX);
            const h = Math.abs(currY - startY);

            //
            cleanupOverlayKeepFlag();
            if (w < 2 || h < 2) { showToast("Selection is too small"); return; }

            //
            const res = await captureTab({ x, y, width: w, height: h })?.catch?.(err => {
                console.warn(err);
                showToast("Failed to capture tab");
                return null;
            });

            //await navigator.clipboard.writeText(data_url);

            // open in new tab for debug
            //window.open(data_url, "_blank");
            //chrome.tabs.create({ url: data_url });
        };

        //
        function updateBox() {
            const x = Math.min(startX, currX);
            const y = Math.min(startY, currY);
            const w = Math.abs(currX - startX);
            const h = Math.abs(currY - startY);

            //
            box.style.left = x + "px";
            box.style.top = y + "px";
            box.style.width = w + "px";
            box.style.height = h + "px";

            //
            sizeBadge.textContent = `${Math.max(0, Math.round(w))} × ${Math.max(0, Math.round(h))}`;
            if (!sizeBadge.isConnected) box.appendChild(sizeBadge);

            //
            //sizeBadge.style.left = (x /*+ w*/) + "px";
            //sizeBadge.style.top = (y /*+ h*/) + "px";
            sizeBadge.style.left = w + "px";
            sizeBadge.style.top = h + "px";
        }

        //
        function cleanupOverlayKeepFlag() {
            hideSelection();
            __snipActive = false;
            dragging = false;
            document.removeEventListener("keydown", onKeyDown, true);
            document.removeEventListener("mousemove", onMouseMove, true);
            document.removeEventListener("mouseup", onMouseUp, true);
            document.removeEventListener("mousecancel", onMouseCancel, true);
        }

        //
        function cleanup() {
            cleanupOverlayKeepFlag();
        }

        //
        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("mousedown", onMouseDown, true);
        document.addEventListener("mouseup", onMouseUp, true);

        //
        __snipActive = true;
        showSelection();
        hint.textContent = "Select area. Esc — cancel";
        sizeBadge.textContent = "";
    }
})();
