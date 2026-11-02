// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-06-config-parity
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const entry=path.resolve('bin/mterm-cli.js');
const plain=r=>r.content.filter(x=>x.type==='text').map(x=>x.text).join('\n');
async function fixture(t,{write=true,configWrite=true,exec=false,innerConfig=false}={}) {
  const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'mterm-config-mcp-')));
  const roots=[path.join(dir,'one'),path.join(dir,'two')];
  for(const root of roots){await fs.mkdir(root);await fs.writeFile(path.join(root,'fixture.txt'),'one\ntwo\nthree\n');}
  const file=path.join(innerConfig?roots[0]:dir,'compat-policy.json'),clients=[];
  t.after(async()=>{for(const {client,transport} of clients){await client.close().catch(()=>{});await transport.close().catch(()=>{});}await fs.rm(dir,{recursive:true,force:true});});
  async function connect() {
    const args=[entry,'mcp','--stdio','--root',roots[0],'--root',roots[1],'--compat-desktop-commander','--compat-config',file,...(write?['--allow-write']:[]),...(configWrite?['--allow-config-write']:[]),...(exec?['--allow-exec']:[])];
    const transport=new StdioClientTransport({command:process.execPath,args,stderr:'pipe',env:{...process.env,CODEX_HOME:path.join(dir,'codex'),MTERM_CONFIG_PATH:path.join(dir,'native-config.json')}});
    const client=new Client({name:'mterm-config-mcp-tests',version:'1.0.0'});clients.push({client,transport});
    await client.connect(transport);
    return {client,call:(name,args={})=>client.callTool({name,arguments:args}),transport};
  }
  return {dir,roots,file,connect};
}
test('real MCP config discovery and live defaults affect both native and compatible reads',async(t)=>{
  const f=await fixture(t),a=await f.connect();
  const names=(await a.client.listTools()).tools.map(x=>x.name);
  assert.ok(names.includes('get_config'));assert.ok(names.includes('set_config_value'));assert.ok(!names.includes('write_pdf'));
  const initial=await a.call('get_config');assert.equal(initial.isError,false);
  assert.deepEqual(initial.structuredContent.config.allowedDirectories,f.roots);
  assert.equal(initial.structuredContent.config.currentClient.name,'mterm-config-mcp-tests');
  assert.equal((await a.call('set_config_value',{key:'fileReadLineLimit',value:1})).isError,false);
  assert.match(plain(await a.call('read_file',{path:path.join(f.roots[0],'fixture.txt')})),/Reading 1 lines/);
  const native=await a.call('mterm_read_file',{path:'fixture.txt'});assert.equal(native.structuredContent.text,'one');
  assert.equal((await a.call('set_config_value',{key:'fileWriteLineLimit',value:1})).isError,false);
  const result=await a.call('write_file',{path:path.join(f.roots[0],'fixture.txt'),mode:'append',content:'four\nfive'});
  assert.equal(result.isError,false);assert.match(plain(result),/tip|chunk/i);
  assert.equal(await fs.readFile(path.join(f.roots[0],'fixture.txt'),'utf8'),'one\ntwo\nthree\nfour\nfive','default paging must not truncate append source');
});
test('separate running MCP processes observe root changes and deny widening authority',async(t)=>{
  const f=await fixture(t),a=await f.connect(),b=await f.connect();
  const mutate=await a.call('set_config_value',{key:'allowedDirectories',value:[f.roots[1]]});assert.equal(mutate.isError,false);
  assert.deepEqual((await b.call('get_config')).structuredContent.config.allowedDirectories,[f.roots[1]]);
  assert.equal((await b.call('read_file',{path:path.join(f.roots[1],'fixture.txt')})).isError,false);
  assert.equal((await b.call('mterm_read_file',{path:path.join(f.roots[0],'fixture.txt')})).isError,true);
  assert.equal((await b.call('mterm_git_status',{path:f.roots[0]})).isError,true);
  const before=await fs.readFile(f.file);
  for(const [key,value] of [['allowedDirectories',[f.dir]],['allowExec',true],['defaultShell','unsafe-shell']])assert.equal((await a.call('set_config_value',{key,value})).isError,true);
  assert.deepEqual(await fs.readFile(f.file),before);
  assert.equal((await a.call('set_config_value',{key:'allowedDirectories',value:[]})).isError,false);
  assert.equal((await b.call('read_file',{path:path.join(f.roots[1],'fixture.txt')})).isError,true);
});
test('file-write permission never implies config mutation permission',async(t)=>{
  const f=await fixture(t,{configWrite:false}),a=await f.connect();
  const names=(await a.client.listTools()).tools.map(x=>x.name);
  assert.ok(names.includes('write_file'));assert.ok(names.includes('get_config'));assert.ok(!names.includes('set_config_value'));
  assert.equal((await a.call('get_config')).structuredContent.config.mterm.configWriteEnabled,false);
  assert.equal(await fs.stat(f.file).then(()=>true,()=>false),false);
});
test('compatibility configuration inside a root cannot be changed through file tools',async(t)=>{
  const f=await fixture(t,{innerConfig:true}),a=await f.connect();
  assert.equal((await a.call('set_config_value',{key:'fileReadLineLimit',value:2})).isError,false);
  const before=await fs.readFile(f.file);
  for(const p of [f.file,f.file+'.previous',f.file+'.lock']) {
    assert.equal((await a.call('write_file',{path:p,mode:'rewrite',content:'{}'})).isError,true);
    assert.equal((await a.call('mterm_read_file',{path:p})).isError,true);
  }
  assert.deepEqual(await fs.readFile(f.file),before);
});
test('blocked process launch applies to native tools and cleanup survives corrupt configuration',async(t)=>{
  const f=await fixture(t,{exec:true}),a=await f.connect();
  const started=await a.call('mterm_start_process',{command:process.execPath,args:['-e','setInterval(()=>{},1000)'],cwd:f.roots[1],timeoutMs:5000});
  assert.equal(started.isError,false);
  try {
    assert.equal((await a.call('set_config_value',{key:'blockedCommands',value:['node']})).isError,false);
    const denied=await a.call('mterm_start_process',{command:process.execPath,args:['-e','process.exit(0)'],cwd:f.roots[1]});
    assert.equal(denied.isError,true);assert.equal(denied.structuredContent.error.code,'COMMAND_BLOCKED');
    await fs.writeFile(f.file,'{broken');
    assert.equal((await a.call('read_file',{path:path.join(f.roots[1],'fixture.txt')})).isError,true);
  } finally {
    const stopped=await a.call('mterm_stop_process',{sessionId:started.structuredContent.sessionId});
    assert.equal(stopped.isError,false);assert.equal(stopped.structuredContent.running,false);
  }
});
