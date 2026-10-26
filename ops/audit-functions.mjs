// Acorn is an audit tool, supplied explicitly; the production game does not need it.
import{readFile,readdir,writeFile}from'node:fs/promises';
import{createRequire}from'node:module';import{resolve}from'node:path';
const require=createRequire(import.meta.url),acorn=require(resolve(process.argv[2]));
const root=new URL('../',import.meta.url),files=[];
for(const name of (await readdir(root)).filter(n=>n.endsWith('.mjs')).sort()){
 const source=await readFile(new URL(name,root),'utf8'),tree=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true}),functions=[];
 function walk(node,parent,scope=[]){
  if(!node||typeof node!=='object')return;
  let next=scope;
  if(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type)){
   const own=node.id?.name??parent?.id?.name??parent?.key?.name??parent?.left?.property?.name??`<callback@${node.loc.start.line}>`;
   functions.push({name:[...scope,own].join('.'),line:node.loc.start.line,async:!!node.async,kind:node.type});next=[...scope,own];
  }
  for(const[key,value]of Object.entries(node)){if(key==='loc')continue;if(Array.isArray(value))for(const child of value)if(child?.type)walk(child,node,next);else{}else if(value?.type)walk(value,node,next);}
 }
 walk(tree);files.push({path:name,language:'javascript',functions});
}
const python=JSON.parse(await readFile(process.argv[3],'utf8'));files.push(...python.files);
const result={schema:'vellum-function-inventory/v1',method:'Acorn AST for JavaScript; Python ast for Python. Includes callbacks and nested functions. This is an inventory, not a statement of 100% behavioral test coverage.',summary:{files:files.length,functions:files.reduce((n,f)=>n+f.functions.length,0)},files};
await writeFile(process.argv[4],JSON.stringify(result,null,2));console.log(JSON.stringify(result.summary));
