import {createTrainingImage, copyTrainingImage, downloadTrainingImage} from '../seer-training-export.js';

export function initTrainingExportPreview(root) {
    const dialog=document.createElement('dialog');
    dialog.className='training-mint-dialog training-export-dialog';
    dialog.setAttribute('aria-labelledby','training-export-title');
    dialog.innerHTML=`<div class="training-dialog-heading"><div><h3 id="training-export-title">匯出圖片</h3><p>預覽培養配置，複製或下載後即可分享。</p></div><button type="button" class="seer-pet-info-close" data-export-close aria-label="關閉匯出預覽">×</button></div><div class="training-export-preview"><img alt="精靈培養配置圖片預覽" hidden></div><p class="training-hint" data-export-preview-status role="status"></p><div class="training-export-actions"><button type="button" class="secondary-button" data-export-preview-retry hidden>重新產生</button><button type="button" data-export-copy disabled>複製圖片</button><button type="button" data-export-download disabled>下載圖片</button></div>`;
    root.append(dialog);
    const image=dialog.querySelector('img'),status=dialog.querySelector('[data-export-preview-status]');
    const copy=dialog.querySelector('[data-export-copy]'),download=dialog.querySelector('[data-export-download]'),retry=dialog.querySelector('[data-export-preview-retry]');
    let data,blob,url,version=0;
    const setDisabled=value=>{copy.disabled=value;download.disabled=value;};
    function release() {
        image.hidden=true;image.removeAttribute('src');
        if(url) URL.revokeObjectURL(url);
        url=null;blob=null;
    }
    async function generate() {
        const request=++version;
        release();setDisabled(true);retry.hidden=true;status.textContent='正在產生圖片…';
        try {
            const result=await createTrainingImage(data);
            if(request!==version || !dialog.open) return;
            blob=result;url=URL.createObjectURL(blob);image.src=url;image.hidden=false;
            image.alt=`${data.petName} · ${data.mode} 培養配置圖片預覽`;
            status.textContent='';setDisabled(false);
        } catch(error) {
            if(request!==version || !dialog.open) return;
            status.textContent=error.message || '圖片產生失敗，請再試一次。';retry.hidden=false;
        }
    }
    dialog.querySelector('[data-export-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{version++;release();data=null;root.querySelector('[data-export-image]').focus({preventScroll:true});});
    retry.addEventListener('click',generate);
    for(const button of [copy,download]) button.addEventListener('click',async()=>{
        if(!blob) return;
        const copying=button===copy;
        setDisabled(true);status.textContent=copying ? '正在複製圖片…' : '正在下載圖片…';
        const request=version;
        try {
            await (copying ? copyTrainingImage(data,blob) : downloadTrainingImage(data,blob));
            if(request===version && dialog.open) status.textContent=copying ? '已複製圖片，可直接貼上分享。' : '已下載 PNG 圖片。';
        } catch(error) {
            if(request===version && dialog.open) status.textContent=copying && error.name==='NotAllowedError' ? '瀏覽器未允許複製圖片，請允許剪貼簿存取後重試，或改用下載圖片。' : error.message || '圖片匯出失敗，請再試一次。';
        } finally {if(request===version && dialog.open) setDisabled(false);}
    });
    return {open(snapshot){data=snapshot;dialog.showModal();generate();}};
}
