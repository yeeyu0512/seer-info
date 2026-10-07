import { TRAINING_STATS } from "./seer-training-core.js";
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
    // Official thumbnails do not provide CORS headers. A public image proxy is
    // only used on explicit export, for this fixed official thumbnail path.
    const source = new URL(url);
    if (source.origin !== "https://newseer.61.com" || !/^\/web\/monster\/head\/\d+\.png$/.test(source.pathname)) throw new Error("角色縮圖來源無效。");
    if (!portraits.has(url)) {
        const params=new URLSearchParams({url,w:"128",h:"128",fit:"inside",output:"png"});
        const pending=loadImage(url).catch(()=>loadImage(`https://wsrv.nl/?${params}`)).catch(error=>{portraits.delete(url);throw error;});
        portraits.set(url,pending);
        if (portraits.size>32) portraits.delete(portraits.keys().next().value);
    }
    return portraits.get(url);
}

// Draw a standalone card so controls and page scroll positions do not affect export.
export async function downloadTrainingImage(data) {
    const [portrait, ...marks] = await Promise.all([
        loadPortrait(data.portrait),
        ...data.mintmarks.map(async mark => {
            if (!mark.id) return null;
            const url=mark.image || await getMintmarkImage(mark.id);
            if (!url) throw new Error(`刻印「${mark.name}」圖片暫時無法取得，請稍後重試。`);
            return loadImage(url);
        })
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 1280;
    const ctx = canvas.getContext("2d");
    const text = (value,x,y,size=24,color="#e9eafa",width=1100) => {
        ctx.font = `${size >= 32 ? "bold " : ""}${size}px "Microsoft JhengHei",sans-serif`;
        ctx.fillStyle = color; ctx.fillText(String(value),x,y,width);
    };
    const panel = (x,y,w,h) => { ctx.fillStyle="#1c2034"; ctx.fillRect(x,y,w,h); };
    const picture = (image,x,y,w,h) => {
        const ratio=Math.min(w/image.naturalWidth,h/image.naturalHeight);
        const width=image.naturalWidth*ratio,height=image.naturalHeight*ratio;
        ctx.drawImage(image,x+(w-width)/2,y+(h-height)/2,width,height);
    };
    ctx.fillStyle="#111525"; ctx.fillRect(0,0,1200,1280);
    ctx.fillStyle="#a496eb"; ctx.fillRect(48,48,60,5);
    text("精靈模擬培養 · Beta 版",48,104,34);
    text(`${data.mode} 能力值`,930,104,26,"#c6baff",220);
    panel(48,138,104,104); picture(portrait,54,144,92,92);
    text(data.petName,176,178,44,"#fff",976);
    text(`#${data.petId} · Lv.100 · ${data.appearance}`,176,223,24,"#a6adc7",976);
    text(`個性：${data.nature}　個體值：${data.iv}　${data.raceVersion}`,48,272,24);
    text(`體力上限培養：${data.hpTraining} / 20　年費加成：${data.year ? "全屬性 +10" : "未勾選"}`,48,315,24);
    TRAINING_STATS.forEach(([key,label],index) => {
        const x=48+(index%2)*568, y=350+Math.floor(index/2)*120;
        panel(x,y,536,100);
        text(label,x+22,y+40,24,"#a6adc7");
        text(data.stats[key],x+160,y+62,42,"#c6baff",170);
        text(`學習力 ${data.ev[key]}`,x+350,y+60,22,"#83cde5",170);
    });
    text("刻印（包含隱藏數值）",48,755,26,"#c6baff");
    data.mintmarks.forEach((mark,i) => {
        panel(48+i*378,777,356,94);
        if (marks[i]) picture(marks[i],60+i*378,789,70,70);
        else text("＋",80+i*378,840,32,"#929ab4",50);
        text(`刻印 ${i+1}`,144+i*378,808,20,"#a6adc7");
        text(mark.name,144+i*378,846,24,"#e9eafa",244);
    });
    text(`套裝：${data.suit}`,48,924,24);
    text(`目鏡：${data.eye}`,48,966,24);
    text(`稱號：${data.title}`,48,1008,24);
    text("戰隊加成",48,1068,26,"#c6baff");
    text(TRAINING_STATS.map(([key,label])=>`${label} +${data.team[key]}`).join("　"),48,1110,22);
    ctx.fillStyle="#353950"; ctx.fillRect(48,1150,1104,1);
    text("賽爾號資訊站 · 模擬結果僅供參考",48,1193,22,"#959db8");
    text("尚未納入異能精靈、特殊套裝例外與戰鬥中條件效果。",48,1232,20,"#959db8");
    const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/png"));
    if (!blob) throw new Error("圖片產生失敗");
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href=url; link.download=`${data.petName.replace(/[<>:"/\\|?*]/g,"_")}-${data.mode}-培養.png`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
}
