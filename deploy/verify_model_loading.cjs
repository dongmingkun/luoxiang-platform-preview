const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const local = "http://127.0.0.1:8020/";
  const site = process.env.TCM_TEST_URL || local;
  const pages = "https://dongmingkun.github.io/luoxiang-platform-preview/";
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const ctx = await browser.newContext({viewport:{width:1280,height:900}});
    const p = await ctx.newPage(), errors = [], network = [];
    p.on("pageerror", e => errors.push(e.message));
    p.on("console", m => { if (m.type()==="error") errors.push(m.text()); });
    const demo = "index.html?demo=1&case=kidneyYang";
    await p.goto(site + demo);
    await p.waitForFunction(() => !!window.__tcmScene && !!window.__luoxiangVue, null, {timeout:40000});
    assert.equal(await p.locator("#stage-ready").innerText(),"本机模型已就绪");
    const stats = () => p.evaluate(()=>({sex:window.__tcmScene.sex,organs:window.__tcmScene.organs.size,paths:window.__tcmScene.meridians.meridians.length}));
    const male = await stats(); assert(male.organs > 0 && male.paths > 0);
    await p.goto(site + "structure.html");
    await p.locator("#empty-state").waitFor({state:"hidden"});
    assert(await p.locator("#organ-list button").count() > 0);
    await p.selectOption("#integrated-sex","female");
    await p.waitForFunction(()=>document.getElementById("model-badge").textContent.includes("女性"));
    console.log("本机已载入",male,await p.locator("#mesh-count").innerText());

    // 在隔离浏览器内模拟 Pages 的无资产发布。所有页面请求仅从本机测试服务取回。
    await ctx.route("**/*", async route => {
      const req=route.request(), url=req.url();
      network.push([req.method(),url]);
      if (!url.startsWith(pages) || req.method()!=="GET") return route.abort();
      const path=url.slice(pages.length);
      if (/^assets\/(?:anatomy_|meridians)/.test(path)) return route.fulfill({status:404,body:""});
      return route.fulfill({response:await ctx.request.get(site+path)});
    });
    const resources={};
    for (const name of ["anatomy_male.glb","anatomy_female.glb","meridians.json","meridians_female.json"]) {
      const r=await ctx.request.get(local+"assets/"+name); assert.equal(r.status(),200);
      resources[name]={name,mimeType:name.endsWith(".glb")?"model/gltf-binary":"application/json",buffer:await r.body()};
    }
    await p.goto(pages+demo);
    await p.locator("#model-actions").waitFor();
    assert.equal(await p.locator("#stage-ready").innerText(),"等待选择模型");
    assert.equal(await p.locator(".loading-ring").isVisible(),false);
    assert.equal(await p.locator("#open-integrated").getAttribute("href"),local+demo);
    await p.setViewportSize({width:390,height:844});
    assert(await p.locator("#pick-teaching-files").isVisible());
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await p.locator("#teaching-files").setInputFiles(resources["anatomy_male.glb"]);
    await p.waitForFunction(()=>document.getElementById("loading-text").textContent.includes("请再选择"));
    await p.locator("#teaching-files").setInputFiles({name:"meridians.json",mimeType:"application/json",buffer:Buffer.from("{}")});
    await p.waitForFunction(()=>document.getElementById("loading-text").textContent.includes("无法读取"));
    await p.locator("#teaching-files").setInputFiles([resources["meridians.json"],resources["anatomy_female.glb"],resources["meridians_female.json"]]);
    await p.waitForFunction(()=>!!window.__tcmScene);
    assert.deepEqual(await stats(),male);
    await p.setViewportSize({width:1280,height:900});
    await p.click("#btn-sex-female");
    await p.waitForFunction(()=>window.__tcmScene.sex==="female"&&!document.getElementById("btn-sex-female").disabled);
    assert.equal(await p.locator("#canvas-wrap canvas").count(),1);
    console.log("网页预览本机选取、错误恢复及女性切换通过",await stats());
    await p.goto(pages+"structure.html");
    await p.waitForFunction(()=>document.getElementById("model-badge").textContent.includes("待选"));
    assert.equal(await p.locator("#structure-integrated-link").getAttribute("href"),local+"structure.html");
    assert.equal(await p.locator("#load-integrated").isVisible(),false);
    await p.click('[data-system="respiratory"]');
    await p.locator("#model-file").setInputFiles(resources["anatomy_female.glb"]);
    await p.locator("#empty-state").waitFor({state:"hidden"});
    assert.equal(await p.locator('[data-system="respiratory"]').getAttribute("aria-pressed"),"true");
    assert(await p.locator("#organ-list button").count()>0);
    assert.deepEqual(network.filter(([method,url])=>method!=="GET"||!url.startsWith(pages)||/\/assets\/(?:anatomy_|meridians)/.test(url)),[]);
    assert.deepEqual(errors,[]);
    console.log("结构筛选、390px 宽、零模型网络请求、零浏览器错误通过");
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
