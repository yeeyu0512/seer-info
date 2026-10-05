// Temporary local renderer harness for the single 42415 probe, not a production API.
// Requires the official @ruffle-rs/ruffle package unpacked into tmp/ruffle/package.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
const assets = new URL('../tmp/ruffle/package/', import.meta.url);
const out = new URL('../tmp/', import.meta.url);
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>刻印圖片測試</title>
<style>body{margin:0;padding:24px;font:16px/1.6 system-ui,sans-serif;background:#101322;color:#eef0ff}main{max-width:560px;margin:auto;padding:24px;background:#191d30;border:1px solid #34394d;border-radius:20px}h1{margin:0;font-size:24px}h2{font-size:16px;margin:24px 0 12px}p{color:#afb7cf}#player{width:50px;height:50px;background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 0 / 10px 10px}ruffle-player{width:50px;height:50px}.sample{padding:20px;background:#fff;border-radius:12px;display:inline-block}#result{width:150px;height:150px;image-rendering:pixelated;background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 0 / 20px 20px}</style>
<main><h1>刻印圖片測試 · #42415</h1><p>網站內建渲染，不需要安裝 Flash，也不使用資料庫。</p><p id="status">正在載入…</p><h2>原始尺寸 · 50 × 50</h2><div class="sample"><div id="player"></div></div><h2>透明 PNG · 放大預覽</h2><img id="result" alt="刻印透明圖片預覽"></main>
<script>window.RufflePlayer={config:{polyfills:false}};</script><script src="/ruffle/ruffle.js"></script>
<script>
async function run(){
 const start=performance.now();
 const player=window.RufflePlayer.newest().createPlayer();
 document.querySelector('#player').append(player);
 const source=new URLSearchParams(location.search).get('source')==='official'?'https://seer.61.com/resource/countermark/icon/42415.swf':'/42415.swf';
 await player.ruffle().load({url:source,wmode:'transparent',autoplay:'on',unmuteOverlay:'hidden',splashScreen:false,contextMenu:'off',allowScriptAccess:false,allowNetworking:'none',openUrlMode:'deny',preferredRenderer:'canvas'});
 let frames=0;
 function capture(){try{
  if(++frames<30){requestAnimationFrame(capture);return;}
  const canvas=player.shadowRoot.querySelector('canvas');
  if(!canvas)throw Error('No rendered canvas');
  const output=document.createElement('canvas');output.width=50;output.height=50;
  output.getContext('2d').drawImage(canvas,0,0,50,50);
  const pixels=output.getContext('2d').getImageData(0,0,50,50).data;
  if(!pixels.some((value,index)=>index%4===3&&value>0)){
   if(performance.now()-start>15000)throw Error('15 秒內沒有取得有效刻印畫面');
   requestAnimationFrame(capture);return;
  }
  const data=output.toDataURL('image/png');
  document.querySelector('#result').src=data;
  fetch('/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,width:50,height:50,source,renderMs:performance.now()-start,method:'Ruffle 0.6.0 canvas, transparent'})}).then(r=>{if(!r.ok)throw Error('Save failed');document.querySelector('#status').textContent='顯示成功，已輸出透明 PNG。';}).catch(fail);
 }catch(e){fail(e);}}
 requestAnimationFrame(capture);
}
function fail(e){document.querySelector('#status').textContent='ERROR: '+e.message;console.error(e);}
run().catch(fail);
</script>`;
createServer(async (req, res) => {
    try {
        if (req.method === 'GET' && new URL(req.url, 'http://localhost').pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(html); }
        if (req.method === 'GET' && req.url === '/gallery') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(await readFile(new URL('probe-mintmark-gallery.html', import.meta.url))); }
        if (req.method === 'GET' && req.url === '/js/seer-mintmark-images.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(await readFile(new URL('../js/seer-mintmark-images.js', import.meta.url))); }
        if (req.method === 'GET' && req.url === '/css/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(await readFile(new URL('../css/style.css', import.meta.url))); }
        if (req.method === 'POST' && req.url === '/save') {
            if (req.headers.origin !== 'http://127.0.0.1:8768') { res.writeHead(403); return res.end(); }
            const chunks = []; let size = 0;
            for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) throw Error('Capture too large'); chunks.push(chunk); }
            const { data, ...report } = JSON.parse(Buffer.concat(chunks).toString());
            if (!/^data:image\/png;base64,/.test(data) || report.width > 1024 || report.height > 1024) throw Error('Invalid capture');
            const png = Buffer.from(data.split(',')[1], 'base64');
            await writeFile(new URL('42415.png', out), png);
            await writeFile(new URL('42415-render-report.json', out), JSON.stringify({ ...report, pngBytes: png.length }, null, 2));
            console.log('PNG saved:', report.width, report.height, png.length, 'bytes');
            return res.end('ok');
        }
        if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
        if (req.url === '/42415.swf') { res.setHeader('Content-Type', 'application/x-shockwave-flash'); return res.end(await readFile(new URL('42415.swf', out))); }
        if (/^\/ruffle\/[a-zA-Z0-9._-]+\.(js|wasm)$/.test(req.url)) {
            res.setHeader('Content-Type', req.url.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
            return res.end(await readFile(new URL(req.url.slice(8), assets)));
        }
        res.writeHead(404); res.end();
    } catch (error) { console.error(error.message); res.writeHead(500); res.end('Probe failed'); }
}).listen(8768, '127.0.0.1', () => console.log('Probe: http://127.0.0.1:8768/'));
