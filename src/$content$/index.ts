import { lastElement, saveCoordinate } from "../$utils$/state";

//
export * from "./operations";
export * from "./service";
export * from "./snip";
export * from "./copy";

//
document.addEventListener("pointerup", saveCoordinate, {passive: true});
document.addEventListener("pointerdown", saveCoordinate, {passive: true});
document.addEventListener("click", saveCoordinate, {passive: true});
document.addEventListener("contextmenu", (e)=>{
    saveCoordinate(e);
    lastElement[0] = (e?.target as HTMLElement || lastElement[0]);
}, {passive: true});
