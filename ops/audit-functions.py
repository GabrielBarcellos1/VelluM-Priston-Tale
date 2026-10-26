"""Enumerate Python function definitions without importing application modules."""
import ast,json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
files=[]
for path in sorted([*root.glob('*.py'),*root.glob('ops/*.py')]):
 tree=ast.parse(path.read_text(encoding='utf-8-sig'));functions=[]
 class Visitor(ast.NodeVisitor):
  stack=[]
  def visit_ClassDef(self,node):
   self.stack.append(node.name);self.generic_visit(node);self.stack.pop()
  def visit_FunctionDef(self,node):
   functions.append({'name':'.'.join([*self.stack,node.name]),'line':node.lineno,'async':isinstance(node,ast.AsyncFunctionDef)})
   self.stack.append(node.name);self.generic_visit(node);self.stack.pop()
  visit_AsyncFunctionDef=visit_FunctionDef
 Visitor().visit(tree);files.append({'path':path.relative_to(root).as_posix(),'language':'python','functions':functions})
Path(sys.argv[1]).write_text(json.dumps({'files':files},ensure_ascii=False),encoding='utf-8')
print(json.dumps({'pythonFiles':len(files),'functions':sum(len(f['functions']) for f in files)}))
