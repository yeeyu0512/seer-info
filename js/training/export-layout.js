import { TRAINING_STATS } from "../seer-training-core.js";

// A standalone image layout, independent of the page's controls and viewport.
export function drawTrainingExport(canvas, data, {portrait, art, marks, background, logo}) {
    canvas.width = 1600;
    const ctx = canvas.getContext("2d");
    const font = (size,bold=false) => `${bold ? "700 " : ""}${size}px "Microsoft JhengHei",sans-serif`;
    const wrap = (value,width,size,bold=false) => {
        ctx.font=font(size,bold);
        const lines=[]; let line="";
        for(const char of String(value)) {
            if(char === "\n") { lines.push(line); line=""; continue; }
            if(line && ctx.measureText(line+char).width > width) { lines.push(line); line=char; }
            else line+=char;
        }
        lines.push(line); return lines;
    };
    ctx.font=font(21);
    const badgeWidth=Math.ceil(ctx.measureText("神諭覺醒").width)+16;
    const headerWidth=664-(logo ? 202 : 0);
    const nameWidth=data.awakened ? headerWidth-badgeWidth-12 : headerWidth;
    const nameSize=wrap(data.petName,nameWidth,36,true).length > 1 ? 28 : 36;
    const nameLines=wrap(data.petName,nameWidth,nameSize,true);
    const headerOffset=(nameLines.length-1)*36;
    const equipment=[["套裝",data.suit],["目鏡",data.eye],["稱號",data.title]].map(([label,value])=>{
        const lines=wrap(value,302,22,true);
        return {label,lines,height:Math.max(52,lines.length*27+18)};
    });
    const equipmentTop=740+headerOffset;
    const panelBottom=equipmentTop+equipment.reduce((sum,row)=>sum+row.height,0)+24;
    canvas.height=panelBottom+36;
    const text = (value,x,y,size=24,color="#e9efff",width=760,bold=false) => {
        ctx.font = font(size,bold);
        ctx.fillStyle=color; ctx.fillText(String(value),x,y,width);
    };
    const field = (label,value,x,y,width) => {
        text(label,x,y,22,"#c8d5ea",width,true);
        const labelWidth=ctx.measureText(label).width+10;
        text(value,x+labelWidth,y,22,"#c8d5ea",width-labelWidth);
    };
    const panel = (x,y,w,h,fill="#101f39",stroke="#304d70",radius=18) => {
        ctx.beginPath(); ctx.roundRect(x,y,w,h,radius); ctx.fillStyle=fill;ctx.fill();
        ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();
    };
    const picture = (image,x,y,w,h) => {
        const ratio=Math.min(w/image.naturalWidth,h/image.naturalHeight);
        const width=image.naturalWidth*ratio,height=image.naturalHeight*ratio;
        ctx.drawImage(image,x+(w-width)/2,y+(h-height)/2,width,height);
    };
    const section = (label,y,x=748,width=720) => {
        ctx.fillStyle="#6b8ee8";ctx.fillRect(x,y-22,4,26);
        text(label,x+18,y,25,"#b9caff",width,true);
    };
    if (background) {
        // Cover the canvas without stretching, including taller long-name exports.
        const scale = Math.max(canvas.width / background.naturalWidth, canvas.height / background.naturalHeight);
        const width = background.naturalWidth * scale, height = background.naturalHeight * scale;
        ctx.drawImage(background, (canvas.width-width)/2, (canvas.height-height)/2, width, height);
        ctx.fillStyle="rgba(5, 13, 27, .32)";ctx.fillRect(0,0,canvas.width,canvas.height);
    } else {
    const bg=ctx.createLinearGradient(0,0,1600,canvas.height);
    bg.addColorStop(0,"#07233b");bg.addColorStop(.6,"#101b35");bg.addColorStop(1,"#14152a");
    ctx.fillStyle=bg;ctx.fillRect(0,0,1600,canvas.height);
    // Subtle stars and a floor grid frame the character without covering it.
    ctx.fillStyle="#3f7191";
    for(let i=0;i<90;i++)ctx.fillRect(24+(i*173)%650,100+(i*97)%(canvas.height-350),i%3===0?2:1,2);
    ctx.strokeStyle="#164569";ctx.lineWidth=1;
    for(let y=canvas.height-380;y<panelBottom+14;y+=35){ctx.beginPath();ctx.moveTo(36,y);ctx.lineTo(688,y);ctx.stroke();}
    for(let x=-400;x<1100;x+=110){ctx.beginPath();ctx.moveTo(360,canvas.height-480);ctx.lineTo(x,panelBottom+14);ctx.stroke();}
    }
    text("賽爾號資訊站",48,60,24,"#b4c4df",540,true);
    text("精靈模擬培養 · 模擬結果僅供參考",48,95,19,"#849dbb",590);
    panel(714,36,842,panelBottom-36,"rgba(16, 27, 48, .75)","#314462",24);
    if (logo) picture(logo,1334,66,180,82);
    picture(art || portrait,48,122,640,panelBottom-346);
    ctx.shadowColor="rgba(5, 12, 24, .85)";
    ctx.shadowBlur=4;
    ctx.shadowOffsetY=1;
    text(data.appearance,48,panelBottom-216,20,"#f5f7fc",630);
    ctx.shadowColor="transparent";
    ctx.shadowBlur=0;
    ctx.shadowOffsetY=0;
    text("刻印 · 最大值與隱藏加成",48,panelBottom-180,22,"#b9caff",630,true);
    data.mintmarks.forEach((mark,i)=>{
        const x=48+i*218;
        const y=panelBottom-162;
        panel(x,y,202,162,"rgba(20, 36, 59, .75)","#426282",16);
        if(marks[i])picture(marks[i],x+51,y+7,100,100);
        else text("＋",x+85,y+74,38,"#7185a4",80);
        text(mark.name,x+12,y+133,19,"#e9efff",178,true);
        text(mark.id ? `#${mark.id}` : `刻印 ${i+1} · 未選擇`,x+12,y+155,15,"#8ea6c7",178);
    });
    panel(748,66,82,82,"#1a2b44","#486183",14);picture(portrait,754,72,70,70);
    nameLines.forEach((line,i)=>text(line,850,106+i*36,nameSize,"#fff",nameWidth,true));
    if(data.awakened) {
        ctx.font=font(nameSize,true);
        const x=850+ctx.measureText(nameLines.at(-1)).width+12,y=106+headerOffset;
        panel(x,y-27,badgeWidth,34,"#2c3154","#575986",9);
        text("神諭覺醒",x+8,y-3,21,"#b6b7ee",badgeWidth-16);
    }
    text(`#${data.petId} · Lv.100 · ${data.appearance}`,850,140+headerOffset,19,"#a4b5d1",headerWidth);
    const modeColor=data.mode==="PVE"?"#8adecc":data.mode==="PVP"?"#c3b1ff":"#b6c9e5";
    panel(748,174+headerOffset,766,45,"#28385e","#455789",10);
    text(`${data.mode} 能力值`,766,205+headerOffset,25,modeColor,730,true);
    field("個性",`${data.nature}${data.natureEffect ? `（${data.natureEffect}）` : ""}`,748,257+headerOffset,455);
    field("天賦",data.iv,1220,257+headerOffset,294);
    field("體力上限",`${data.hpTraining} / 20`,748,299+headerOffset,450);
    field("年費加成",data.year ? "開（全屬性+10）" : "關",1220,299+headerOffset,294);
    section("最終能力",354+headerOffset);
    text("能力值 / 學習力",1310,354+headerOffset,18,"#849dbb",204);
    const order=["atk","def","sp_atk","sp_def","spd","hp"];
    order.forEach((key,i)=>{
        const label=TRAINING_STATS.find(([stat])=>stat===key)[1];
        const x=748+(i%2)*393,y=374+headerOffset+Math.floor(i/2)*90;
        panel(x,y,373,76,"#172740","#2b4160",12);
        text(label,x+18,y+45,23,"#a4b5d1",70);
        text(data.stats[key],x+98,y+48,34,modeColor,142,true);
        text(data.ev[key],x+270,y+46,26,"#78cfea",86,true);
    });
    text(`學習力合計  ${TRAINING_STATS.reduce((sum,[key])=>sum+(Number(data.ev[key])||0),0)} / 510`,748,670+headerOffset,19,"#8ea6c7",766);
    section("裝備",719+headerOffset,748,374);
    section("戰隊加成",719+headerOffset,1164,332);
    ctx.fillStyle="#2b4160";ctx.fillRect(1150,equipmentTop,1,panelBottom-equipmentTop-24);
    let rowY=equipmentTop;
    equipment.forEach(({label,lines,height})=>{
        text(label,748,rowY+27,20,"#a4b5d1",70);
        lines.forEach((line,i)=>text(line,830,rowY+27+i*27,22,"#e9efff",302,true));
        rowY+=height;
    });
    order.forEach((key,i)=>{
        const label=TRAINING_STATS.find(([stat])=>stat===key)[1];
        const x=1164+(i%2)*178,y=equipmentTop+27+Math.floor(i/2)*52;
        text(label,x,y,20,"#a4b5d1",64);
        text(`+${data.team[key]}`,x+72,y,23,"#b9caff",86,true);
    });
    return canvas;
}
