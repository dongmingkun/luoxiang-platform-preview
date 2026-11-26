const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({channel: "chrome"});
  try {
    const page = await browser.newPage({ viewport: {width: 1440, height: 900} });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    const base = process.env.TCM_TEST_URL || "http://127.0.0.1:8020";
    assert.equal((await page.goto(base + "/yangqi.html")).status(), 200);
    await page.waitForFunction(() => !!window.__yangqiScene, null, {timeout: 90000});
    const active = () => page.locator("#shichen-slider").inputValue();
    for (const [i, code] of ["LI","ST","SP","HT","SI","BL","KI","PC","TE","GB","LR","LU"].entries()) {
      await page.locator(".shichen-tick").nth(i).click();
      assert.deepEqual(await page.evaluate(() => window.__yangqiScene.affectedMeridians), [code]);
      assert.equal(await active(), String(i));
      assert.match(await page.locator("#shichen-degree-tag").innerText(), i < 6 ? /昼行阳分/ : /夜行阴分/);
    }
    await page.click("#slot-next"); assert.equal(await active(),"0");
    await page.click("#slot-prev"); assert.equal(await active(),"11");
    assert.match(await page.locator("#shichen-degree-tag").innerText(), /25 \/ 共 25/);
    await page.click("#btn-yq-night"); assert.equal(await active(),"6");
    await page.click("#btn-yq-day"); assert.equal(await active(),"0");
    await page.click("#btn-yq-cycle");
    await page.click("#slot-next");
    assert.equal(await page.locator("#btn-yq-cycle").getAttribute("aria-pressed"),"false");
    await page.click("#atlas-open");
    assert.equal(await page.locator("#st-point option").count(),45);
    await page.check("#st-all");
    assert(await page.locator("#surface-tags .acu").count() >= 3);
    await page.uncheck("#st-all");
    for (const sex of ["male","female"]) {
      if (sex === "female") {
        await page.click("#btn-sex-female");
        await page.waitForFunction(() => document.querySelector("#btn-sex-female.is-on") && !document.querySelector("#btn-sex-female").disabled);
      }
      const geometry = await page.evaluate(() => {
        const s=window.__yangqiScene, ks=s.kidneyAnchors;
        const st=s.meridians.meridians.filter(m=>m.baseId==="ST");
        return { sides: ks.map(p=>Math.sign(p.x)), stomach:s.organs.get("Stomach").center.x>0,
          recessed:ks.every(p=>p.z<s.organs.get("Stomach").center.z),
          faceToFoot: st.length===2 && st.every(m=>m.curve.getPoint(0).y>s.modelHeight*.9 && m.curve.getPoint(1).y<s.modelHeight*.1) };
      });
      assert.deepEqual(geometry,{sides:[1,-1],stomach:true,recessed:true,faceToFoot:true});
      await page.click("#inspect-kidneys");
      assert.deepEqual(await page.evaluate(()=>[window.__yangqiScene.camera.position.z<0,
        ...[...window.__yangqiScene.organs.values()].filter(o=>o.mesh.visible).map(o=>o.key)]),[true,"Kidneys"]);
      assert.equal(await page.locator(".surface-tag[class*=kidney]:visible").count(),2);
      await page.click("#inspect-stomach");
      assert.deepEqual(await page.evaluate(()=>[window.__yangqiScene.camera.position.z>0,
        ...[...window.__yangqiScene.organs.values()].filter(o=>o.mesh.visible).map(o=>o.key)]),[true,"Stomach"]);
      await page.click("#btn-view-reset");
    }
    await page.click("#btn-mode-holo"); assert.equal(await page.locator("#skin-opacity").inputValue(),"0.07");
    await page.click("#btn-mode-real"); assert.equal(await page.locator("#skin-opacity").inputValue(),"0.38");
    await page.click("#atlas-open");
    await page.selectOption("#st-point","ST45");
    assert.match(await page.locator("#st-detail").innerText(), /厉兑.*5\.3\.45/);
    assert.match(await page.locator("#st-status").innerText(),/待标定/);
    await page.click("#st-locate");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#st-locate").getAttribute("aria-pressed"),"false");
    await page.selectOption("#st-point","ST25");
    await page.click("#st-region");
    await page.waitForFunction(()=> !window.__yangqiScene._cameraTween);
    await page.locator(".surface-tag.acu").filter({hasText:"天枢"}).click();
    assert.match(await page.locator("#st-detail").innerText(),/天枢/);
    // 用浏览器点在当前皮肤上，测试标记生命周期，不保存坐标样本。
    async function markCurrentAt(u) {
      await page.click("#st-locate");
      const xy = await page.evaluate(u => {
        const s=window.__yangqiScene;
        s.setCameraPreset("front", false);
        s.camera.updateMatrixWorld();
        const m=s.meridians.meridians.find(m=>m.id==="ST_L");
        const p=m.curve.getPointAt(u).project(s.camera), r=s.renderer.domElement.getBoundingClientRect();
        return [r.left+(p.x+1)*r.width/2,r.top+(1-p.y)*r.height/2];
      },u);
      await page.mouse.click(...xy);
      assert.match(await page.locator("#st-status").innerText(),/本机标记/);
    }
    await page.selectOption("#st-point","ST19");
    await markCurrentAt(0.27);
    await page.selectOption("#st-point","ST25");
    await markCurrentAt(0.34);
    await page.selectOption("#st-point","ST22");
    assert.match(await page.locator("#st-status").innerText(),/骨度比例候选/);
    await markCurrentAt(0.30);
    assert.match(await page.locator("#st-metric").textContent(), /模型身高 [0-9.]+%/);
    await page.selectOption("#st-side","R");
    assert.match(await page.locator("#st-status").innerText(),/坐标待标定.*0 \/ 45/);
    await page.selectOption("#st-side","L");
    await page.locator(".atlas-card details summary").click();
    const downloadEvent = page.waitForEvent("download");
    await page.click("#st-export");
    const download = await downloadEvent;
    const file = await download.path();
    await page.reload();
    await page.waitForFunction(()=>window.__yangqiScene);
    await page.click("#atlas-open");
    await page.locator(".atlas-card details summary").click();
    await page.locator("#st-import").setInputFiles(file);
    await page.waitForFunction(()=>document.querySelector("#st-status").textContent.includes("无法导入"));
    await page.click("#btn-sex-female");
    await page.waitForFunction(()=>document.querySelector("#btn-sex-female.is-on") && !document.querySelector("#btn-sex-female").disabled);
    await page.locator("#st-import").setInputFiles(file);
    await page.waitForFunction(()=>document.querySelector("#st-status").textContent.includes("3 / 45"));
    await download.delete();
    for (const width of [1280,390]) {
      await page.setViewportSize({width,height:900});
      await page.click("#slot-next");
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"horizontal overflow at "+width);
    }
    assert.deepEqual(errors,[]);
    console.log("PASS · 12 hour slots, two time tracks, phase boundaries, manual navigation, 45 entries, both meshes & camera views, labels, display modes, 1280/390 layout, zero browser errors.");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
