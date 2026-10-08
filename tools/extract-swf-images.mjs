import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [source,out] = process.argv.slice(2);
if (!source || !out) throw new Error('Usage: node tools/extract-swf-images.mjs source.swf output-directory');
const input=fs.readFileSync(source);
const signature=input.toString('ascii',0,3);
const body=signature==='CWS'?zlib.inflateSync(input.subarray(8)):signature==='FWS'?input.subarray(8):null;
if (!body) throw new Error(`Unsupported SWF compression: ${signature}`);
fs.mkdirSync(out,{recursive:true});
let offset=Math.ceil((5+4*(body[0]>>3))/8)+4;
let tables=null;
const manifest=[];
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,bytes){const name=Buffer.from(type);const data=Buffer.concat([name,bytes]);let crc=0xffffffff;for(const b of data)crc=crcTable[(crc^b)&255]^(crc>>>8);const len=Buffer.alloc(4),tail=Buffer.alloc(4);len.writeUInt32BE(bytes.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([len,data,tail]);}
function png(w,h,rgba){const head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;head[9]=6;const rows=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)rgba.copy(rows,y*(w*4+1)+1,y*w*4,(y+1)*w*4);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
while(offset<body.length){
    const header=body.readUInt16LE(offset);offset+=2;const tag=header>>>6;let length=header&63;
    if(length===63){length=body.readUInt32LE(offset);offset+=4;}
    const data=body.subarray(offset,offset+length);offset+=length;
    if(tag===0)break;
    if(tag===8){tables=data;continue;}
    if(![6,20,21,35,36,90].includes(tag))continue;
    const id=data.readUInt16LE(0);let image,ext='png',width,height;
    if(tag===20||tag===36){
        const format=data[2];width=data.readUInt16LE(3);height=data.readUInt16LE(5);
        const alpha=tag===36;const paletteSize=format===3?data[7]+1:0;
        const raw=zlib.inflateSync(data.subarray(format===3?8:7));
        const rgba=Buffer.alloc(width*height*4);
        for(let y=0;y<height;y++)for(let x=0;x<width;x++){
            const dest=(y*width+x)*4;let r,g,b,a=255;
            if(format===5){const pos=(y*width+x)*4;a=alpha?raw[pos]:255;r=raw[pos+1];g=raw[pos+2];b=raw[pos+3];}
            else if(format===3){const stride=(width+3)&~3;const pos=raw[paletteSize*(alpha?4:3)+y*stride+x]*(alpha?4:3);r=raw[pos];g=raw[pos+1];b=raw[pos+2];a=alpha?raw[pos+3]:255;}
            else if(format===4){const pos=y*((width*2+3)&~3)+x*2;const value=raw.readUInt16LE(pos);r=Math.round(((value>>10)&31)*255/31);g=Math.round(((value>>5)&31)*255/31);b=Math.round((value&31)*255/31);}
            else throw new Error(`Unsupported lossless format ${format}`);
            // SWF lossless alpha colors are premultiplied.
            if(alpha&&a){r=Math.min(255,Math.round(r*255/a));g=Math.min(255,Math.round(g*255/a));b=Math.min(255,Math.round(b*255/a));}
            rgba.set([r,g,b,a],dest);
        }
        image=png(width,height,rgba);
    } else {
        let start=2,end=data.length;
        if(tag===35||tag===90){start=tag===90?8:6;end=start+data.readUInt32LE(2);}
        image=data.subarray(start,end);
        if(tag===6&&tables)image=Buffer.concat([tables.subarray(0,tables.length-2),image.subarray(2)]);
        if(image.subarray(0,4).equals(Buffer.from([255,217,255,216])))image=image.subarray(2);
        ext=image[0]===137?'png':image.toString('ascii',0,3)==='GIF'?'gif':'jpg';
        if(tag===35||tag===90){const file=`bitmap-${id}-alpha.bin`;fs.writeFileSync(path.join(out,file),zlib.inflateSync(data.subarray(end)));}
    }
    const file=`bitmap-${id}.${ext}`;fs.writeFileSync(path.join(out,file),image);manifest.push({id,tag,file,width,height,bytes:image.length});
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({signature,images:manifest},null,2));
