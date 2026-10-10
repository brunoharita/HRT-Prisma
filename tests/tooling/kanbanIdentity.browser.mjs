import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const baseline=process.argv.includes('--baseline'),dir='docs/qa/evidence/kanban-identity-v235',results=[];
await mkdir(dir,{recursive:true});
try {
  for(const width of [2048,1448,768,390,320]) for(const scenario of ['reference','long','missing']) {
    const p=await browser.newPage({viewport:{width,height:1225}}),errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:5713/')?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:5713/position-follow-up.html?case=${scenario}`);
    await p.locator('.pf-card').first().waitFor();
    const cards=p.locator('.pf-card:visible');
    const geometry=await cards.evaluateAll(ns=>ns.map(n=>{
      const b=s=>{const r=n.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
      return {name:n.querySelector('.pf-person').textContent,identity:b('.pf-card-identity'),avatar:b('.pf-avatar'),checkbox:b('.ant-checkbox-wrapper'),aside:b('.pf-card-aside'),score:b('.pf-score'),cardWidth:n.clientWidth,overflow:n.scrollWidth>n.clientWidth};
    }));
    await p.screenshot({path:`${dir}/${baseline?'before':'after'}-${scenario}-${width}.png`,fullPage:true});
    if(!baseline){
      assert.equal(errors.length,0);
      for(const g of geometry){
        assert.ok(g.identity.width>g.cardWidth*.35,`identity occupies flexible center, not score track: ${width}/${scenario}/${g.name}`);
        assert.ok(g.avatar.x<g.identity.x&&g.identity.x<g.score.x,'identity between leading controls and score');
        assert.ok(Math.abs(g.avatar.x-g.checkbox.x)<12,'selection grouped with avatar');
        assert.equal(g.score.width,50);assert.equal(g.score.height,50);assert.ok(!g.overflow);
      }
      if(width<=768)assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      const chosen=cards.first();await chosen.getByRole('checkbox').check();assert.ok(await chosen.getByRole('checkbox').isChecked());
      const action=chosen.getByRole('combobox',{name:/Mover etapa/});assert.ok(await action.isEnabled());
      await chosen.getByRole('button',{name:'Ver detalhes',exact:true}).click();await p.getByRole('dialog').waitFor();
      assert.ok(await p.getByRole('dialog').isVisible());
      await p.getByRole('button',{name:'Fechar',exact:true,includeHidden:true}).click();
      assert.ok((await p.evaluate(()=>window.__followUpFixture.calls)).every(c=>!c.name.startsWith('mutate_')));
      if(scenario==='reference'&&width===1448){
        const previous=await p.evaluate(()=>window.__followUpFixture.data.entries.map(e=>[e.personId,e.score]));
        const handle=chosen.getByRole('button',{name:/Arrastar/}),source=await handle.boundingBox();
        const target=await p.locator('[data-column="awaiting_interview"]').boundingBox();
        await p.mouse.move(source.x+12,source.y+12);await p.mouse.down();
        await p.mouse.move(source.x+25,source.y+25,{steps:8});await p.mouse.move(target.x+80,target.y+110,{steps:20});await p.mouse.up();
        await p.waitForFunction(()=>window.__followUpFixture.data.entries[0].stage==='awaiting_interview');
        assert.deepEqual(await p.evaluate(()=>window.__followUpFixture.data.entries.map(e=>[e.personId,e.score])),previous);
      }
      if(scenario==='reference'&&width===390){
        await action.click();await p.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({hasText:'Aguardando entrevista'}).click();
        await p.waitForFunction(()=>window.__followUpFixture.data.entries[0].stage==='awaiting_interview');
        assert.equal(await p.evaluate(()=>window.__followUpFixture.data.entries[0].score),56);
      }
    }
    results.push({width,scenario,geometry,pass:baseline?null:true});await p.close();
  }
  await writeFile(`${dir}/${baseline?'baseline':'browser-results'}.json`,JSON.stringify(results,null,2));
  console.log(`${baseline?'BASELINE':'PASS'}: ${results.length} viewport/content scenarios`);
}finally{await browser.close();}
