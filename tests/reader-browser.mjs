import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const u=new URL('.'+(p==='/'?'/index.html':p),root);if(!u.href.startsWith(root.href))throw Error();res.setHeader('Content-Type',u.pathname.endsWith('.mjs')?'text/javascript':u.pathname.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(await readFile(u));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();const page=await browser.newPage();
try{for(const id of ['01','02','03','04','05','06']){await page.goto(`http://127.0.0.1:${server.address().port}/output/markdown/reader.html?book=${id}`);await page.waitForSelector('body[data-ready="true"]',{timeout:60000});assert.ok(await page.locator('#book').innerText());console.log(`Text reader ${id}: loaded`);}}finally{await browser.close();await new Promise(r=>server.close(r));}
