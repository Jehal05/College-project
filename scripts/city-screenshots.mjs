// Screenshots for the README (patient Hospitals screen and portal map, both cities, 360 and 1440 px). Needs patient-app/dist-joint and hospital-portal/dist-joint-cities built first (see scripts/joint-cities.mjs).
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const kids=[]; process.on('exit',()=>kids.forEach(k=>k.kill()));
const run=(c,a,o)=>kids.push(spawn(c,a,{stdio:'ignore',...o}));
run('node',['server.js'],{cwd:'mock-server',env:{...process.env,PORT:'4300',CORS_ORIGINS:'http://localhost:5374'}});
run('npx',['vite','preview','--outDir','dist-joint','--port','5374','--strictPort'],{cwd:'patient-app'});
run('npx',['vite','preview','--outDir','dist-joint-cities','--port','5174','--strictPort'],{cwd:'hospital-portal'});
await new Promise(r=>setTimeout(r,6000));
const API='http://localhost:4300';
const api=async(m,u,t,b)=>(await fetch(API+u,{method:m,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined})).json().catch(()=>({}));
const tok=(await api('POST','/auth/login',null,{email:'patient@demo.test',password:'demo1234'})).token;
const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const out='docs/images/cities/';
for (const [id,name] of [['AMD','ahmedabad'],['PNQ','pune']]) {
  await api('PATCH','/patients/PT-2026-0417',tok,{home_city_id:id});
  for (const w of [360,1440]) {
    const ctx=await br.newContext({viewport:{width:w,height:w===360?740:900},deviceScaleFactor:1});
    const p=await ctx.newPage();
    await p.goto('http://localhost:5374/login');await p.fill('input[type=email]','patient@demo.test');await p.fill('input[type=password]','demo1234');await p.click('button[type=submit]');await p.waitForURL('http://localhost:5374/');
    await p.goto('http://localhost:5374/hospitals');await p.waitForSelector('ol[aria-label=Hospitals] li');await p.waitForTimeout(800);
    await p.screenshot({path:out+`patient-hospitals-${name}-${w}.png`});
    await ctx.close();
    const c2=await br.newContext({viewport:{width:w,height:w===360?740:900}});
    const d=await c2.newPage();
    await d.goto('http://localhost:5174/login');await d.locator('input').nth(0).fill('admin@demo');await d.locator('input').nth(1).fill('demo123');await d.click('button:has-text("Log in")');await d.waitForURL('**/dashboard');
    await d.getByTestId('city-switcher').selectOption(id).catch(()=>{});
    await d.goto('http://localhost:5174/map');await d.waitForTimeout(1500);
    await d.getByTestId('city-switcher').selectOption(id).catch(()=>{});await d.waitForTimeout(800);
    await d.screenshot({path:out+`portal-map-${name}-${w}.png`});
    await c2.close();
  }
}
await br.close();process.exit(0);
