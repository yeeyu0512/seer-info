import { drawTrainingExport } from "./training/export-layout.js";
import { getMintmarkImage } from "./seer-mintmark-images.js";

function loadImage(url) {
    return new Promise((resolve,reject) => {
        const image = new Image(); image.crossOrigin="anonymous";
        const timeout = setTimeout(() => { image.src=""; reject(new Error("圖片載入逾時，請稍後重試。")); },15000);
        image.onload=()=>{clearTimeout(timeout);resolve(image);};
        image.onerror=()=>{clearTimeout(timeout);reject(new Error("圖片暫時無法取得，請稍後重試。"));};
        image.src=url;
    });
}

const portraits = new Map();
async function loadPortrait(url) {
    // Official character images do not provide CORS headers. Use a public image
    // proxy only on explicit export, restricted to official head/body paths.
    const source = new URL(url);
    if (source.origin !== "https://newseer.61.com" || !/^\/web\/monster\/(head|body)\/\d+\.png$/.test(source.pathname)) throw new Error("角色縮圖來源無效。");
    if (!portraits.has(url)) {
        const params=new URLSearchParams({url,w:source.pathname.includes("/body/") ? "1000" : "128",h:source.pathname.includes("/body/") ? "1000" : "128",fit:"inside",output:"png"});
        const pending=loadImage(url).catch(()=>loadImage(`https://wsrv.nl/?${params}`)).catch(error=>{portraits.delete(url);throw error;});
        portraits.set(url,pending);
        if (portraits.size>32) portraits.delete(portraits.keys().next().value);
    }
    return portraits.get(url);
}

// Draw a standalone card so controls and page scroll positions do not affect export.
export async function downloadTrainingImage(data) {
    const [portrait, art, ...marks] = await Promise.all([
        loadPortrait(data.portrait),
        data.art ? loadPortrait(data.art).catch(() => null) : null,
        ...data.mintmarks.map(async mark => {
            if (!mark.id) return null;
            const url=mark.image || await getMintmarkImage(mark.id);
            if (!url) throw new Error(`刻印「${mark.name}」圖片暫時無法取得，請稍後重試。`);
            return loadImage(url);
        })
    ]);
    const canvas = document.createElement("canvas");
    drawTrainingExport(canvas,data,{portrait,art,marks});
    const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/png"));
    if (!blob) throw new Error("圖片產生失敗");
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href=url; link.download=`${data.petName.replace(/[<>:"/\\|?*]/g,"_")}-${data.mode}-培養.png`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
}
