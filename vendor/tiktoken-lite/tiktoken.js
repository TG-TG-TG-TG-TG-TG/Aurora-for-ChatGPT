import * as bg from "./tiktoken_bg.js";

let wasm;

export async function init(wasmUrl) {
    if (wasm) return wasm;
    const response = await fetch(wasmUrl);
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {
        "./tiktoken_bg.js": bg
    });
    wasm = instance.exports;
    bg.__wbg_set_wasm(wasm);
    return wasm;
}

export * from "./tiktoken_bg.js";
