// 非安全上下文补齐：经 http://IP:端口 直连访问时（无域名/证书），浏览器不会提供
// 仅限安全上下文（HTTPS 或 localhost）的 API——crypto.randomUUID 直接不存在
// （报 “crypto.randomUUID is not a function”），navigator.clipboard 也会缺失。
// 本地走 localhost 访问属于安全上下文所以无感；云端 IP 直连必须在此补齐。
// 注：crypto.getRandomValues 不受安全上下文限制，用它生成 UUID v4 足够。

const cryptoRef = globalThis.crypto as (Crypto & { randomUUID?: () => string }) | undefined;

if (cryptoRef && typeof cryptoRef.randomUUID !== "function") {
  const UUID_TEMPLATE = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  Object.defineProperty(cryptoRef, "randomUUID", {
    configurable: true,
    writable: true,
    value: () =>
      UUID_TEMPLATE.replace(/[xy]/gu, (char) => {
        const rand = (cryptoRef.getRandomValues(new Uint8Array(1))[0] ?? 0) & 0x0f;
        const value = char === "x" ? rand : (rand & 0x03) | 0x08;
        return value.toString(16);
      })
  });
}

if (typeof navigator !== "undefined" && !navigator.clipboard?.writeText) {
  // 退化为 execCommand('copy')：非安全上下文可用，覆盖各复制按钮
  const copyFallback = (text: string) =>
    new Promise<void>((resolve, reject) => {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        if (ok) resolve();
        else reject(new Error("copy failed"));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: copyFallback }
  });
}

export {};
