import { TRAINING_STATS } from "../seer-training-core.js";

// A standalone image layout, independent of the page's controls and viewport.
export function drawTrainingExport(canvas, data, {portrait, art, marks}) {
    canvas.width = 1600; canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    const text = (value,x,y,size=24,color="#e9efff",width=760,bold=false) => {
        ctx.font = `${bold ? "700 " : ""}${size}px "Microsoft JhengHei",sans-serif`;
        ctx.fillStyle=color; ctx.fillText(String(value),x,y,width);
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
    const section = (label,y) => {
        ctx.fillStyle="#6b8ee8";ctx.fillRect(748,y-22,4,26);
        text(label,766,y,25,"#b9caff",720,true);
    };
    const bg=ctx.createLinearGradient(0,0,1600,1200);
    bg.addColorStop(0,"#07233b");bg.addColorStop(.6,"#101b35");bg.addColorStop(1,"#14152a");
    ctx.fillStyle=bg;ctx.fillRect(0,0,1600,1200);
    // Subtle stars and a floor grid frame the character without covering it.
    ctx.fillStyle="#3f7191";
    for(let i=0;i<90;i++)ctx.fillRect(24+(i*173)%650,100+(i*97)%750,i%3===0?2:1,2);
    ctx.strokeStyle="#164569";ctx.lineWidth=1;
    for(let y=820;y<1120;y+=35){ctx.beginPath();ctx.moveTo(36,y);ctx.lineTo(688,y);ctx.stroke();}
    for(let x=-400;x<1100;x+=110){ctx.beginPath();ctx.moveTo(360,720);ctx.lineTo(x,1120);ctx.stroke();}
    text("賽爾號資訊站",48,60,24,"#b4c4df",540,true);
    text("精靈模擬培養 · Beta 版",48,95,19,"#849dbb",590);
    panel(714,36,842,1070,"#101b30","#314462",24);
    picture(art || portrait,48,122,640,738);
    text(data.appearance,48,890,20,"#9ab3d3",630);
    text("刻印 · 最大值與隱藏加成",48,926,22,"#b9caff",630,true);
    data.mintmarks.forEach((mark,i)=>{
        const x=48+i*218;
        panel(x,944,202,162,"#14243b","#426282",16);
        if(marks[i])picture(marks[i],x+51,951,100,100);
        else text("＋",x+85,1018,38,"#7185a4",80);
        text(mark.name,x+12,1077,19,"#e9efff",178,true);
        text(mark.id ? `#${mark.id}` : `刻印 ${i+1} · 未選擇`,x+12,1099,15,"#8ea6c7",178);
    });
    panel(748,66,82,82,"#1a2b44","#486183",14);picture(portrait,754,72,70,70);
    text(data.petName,850,106,36,"#fff",664,true);
    text(`#${data.petId} · Lv.100 · ${data.appearance}`,850,140,19,"#a4b5d1",664);
    const modeColor=data.mode==="PVE"?"#8adecc":data.mode==="PVP"?"#c3b1ff":"#b6c9e5";
    panel(748,174,766,45,"#28385e","#455789",10);
    text(`${data.mode} 能力值`,766,205,25,modeColor,730,true);
    text(`個性  ${data.nature}`,748,257,23,"#c8d5ea",455);
    text(`個體值  ${data.iv} / 31`,1220,257,23,"#c8d5ea",294);
    text(`種族值  ${data.raceVersion}`,748,299,22,"#a4b5d1",766);
    text(`體力上限培養  ${data.hpTraining} / 20`,748,341,22,"#a4b5d1",450);
    text(`年費  ${data.year ? "全屬性 +10" : "未勾選"}`,1220,341,22,"#a4b5d1",294);
    section("最終能力",396);
    text("能力值 / 學習力",1310,396,18,"#849dbb",204);
    const order=["atk","def","sp_atk","sp_def","spd","hp"];
    order.forEach((key,i)=>{
        const label=TRAINING_STATS.find(([stat])=>stat===key)[1];
        const x=748+(i%2)*393,y=416+Math.floor(i/2)*90;
        panel(x,y,373,76,"#172740","#2b4160",12);
        text(label,x+18,y+45,23,"#a4b5d1",70);
        text(data.stats[key],x+98,y+48,34,modeColor,142,true);
        text(data.ev[key],x+270,y+46,26,"#78cfea",86,true);
    });
    text(`學習力合計  ${TRAINING_STATS.reduce((sum,[key])=>sum+(Number(data.ev[key])||0),0)} / 510`,748,712,19,"#8ea6c7",766);
    section("裝備與稱號",763);
    [["套裝",data.suit],["目鏡",data.eye],["稱號",data.title]].forEach(([label,value],i)=>{
        const y=784+i*58;
        panel(748,y,766,48,"#19243d","#2c3b59",10);
        text(label,766,y+32,20,"#a4b5d1",88);
        text(value,876,y+32,22,"#e9efff",618,true);
    });
    section("戰隊加成",1000);
    TRAINING_STATS.forEach(([key,label],i)=>{
        const x=748+(i%3)*260,y=1040+Math.floor(i/3)*36;
        text(label,x,y,20,"#a4b5d1",90);
        text(`+${data.team[key]}`,x+104,y,23,"#b9caff",140,true);
    });
    text("模擬結果僅供參考 · UI 尚未調整完成",48,1149,19,"#92a3be",1504);
    text("尚未納入異能精靈、特殊套裝例外與戰鬥中條件效果。",48,1180,18,"#788da9",1504);
    return canvas;
}
