const COPY_HACK = async (data) => {
    return navigator.permissions.query({ name: "clipboard-write" })?.then?.((result)=>{
        if (result.state == "granted" || result.state == "prompt") {
            return navigator?.clipboard?.writeText?.((typeof data == "string" ? data : JSON.stringify(data)) || " ")?.catch?.(err => {
                console.warn('Failed to copy text: ', err); return null;
            });
        }
        return null;
    });
}

//
chrome.runtime.onMessage.addListener((res, sender, sendResponse) => {
    if (res?.type == "COPY_HACK") {
        COPY_HACK(res?.data)?.then?.((ok)=>{
            sendResponse?.({ ok: ok ?? true, data: res?.data });
        })?.catch?.((err)=>{
            console.warn('Failed to copy text: ', err);
            sendResponse?.({ ok: false, data: res?.data });
        });
    }
    return true;
});
