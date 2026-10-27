"""Every local JavaScript import must be servable before deployment."""
import re,unittest
from pathlib import Path
import iniciar

ROOT=Path(__file__).resolve().parents[1]
PATTERN=re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*)['"]((?:/|\./|\.\./)[^'"]+\.mjs)['"]""")
class ModuleRoutes(unittest.TestCase):
 def test_imports_exist_and_are_allowed_by_the_http_server(self):
  handler=Path(iniciar.__file__).read_text(encoding='utf8')
  missing=[]
  for file in ROOT.glob('*.mjs'):
   for import_path in PATTERN.findall(file.read_text(encoding='utf8')):
    module=(ROOT/import_path.lstrip('/')) if import_path.startswith('/') else (file.parent/import_path)
    module=module.resolve()
    if not module.is_file() or not module.is_relative_to(ROOT) or ("'/" + module.name + "'") not in handler:
     missing.append((file.name,import_path))
  self.assertFalse(missing, 'Unserved module imports would cause session startup 404: '+str(missing))
