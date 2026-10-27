"""Missing upstream assets should not be retried on each frame or reported as server 502."""
import tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
import iniciar

class MissingAssetTests(unittest.TestCase):
    def test_missing_asset_uses_short_negative_cache(self):
        with tempfile.TemporaryDirectory() as folder:
            path='/assets/models/field/forever-fall/unknown-fixture.model.json'
            e=HTTPError('https://cdn.pweb.world'+path,404,'Not Found',{},None)
            with patch.object(iniciar,'CACHE',Path(folder)),patch.object(iniciar,'urlopen',side_effect=e) as download:
                iniciar.MISSING_ASSETS.pop(path,None)
                with self.assertRaises(FileNotFoundError):
                    iniciar.static_asset(path)
                with self.assertRaises(FileNotFoundError):
                    iniciar.static_asset(path)
                self.assertEqual(download.call_count,1)
                iniciar.MISSING_ASSETS.pop(path,None)
    def test_existing_cached_asset_still_serves(self):
        with tempfile.TemporaryDirectory() as folder:
            path='/assets/field/sample-fixture.png'
            file=Path(folder)/path.lstrip('/')
            file.parent.mkdir(parents=True)
            file.write_bytes(b'png-data')
            with patch.object(iniciar,'CACHE',Path(folder)),patch.object(iniciar,'urlopen') as download:
                self.assertEqual(iniciar.static_asset(path),b'png-data')
                download.assert_not_called()
    def test_missing_asset_not_promoted_to_generic_502(self):
        from inspect import getsource
        source=getsource(iniciar.Handler.do_GET)
        self.assertIn('except FileNotFoundError:',source)
        self.assertIn('self.send_error(404',source)
