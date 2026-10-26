import copy,time,uuid
from test_server_audit import ServerAudit
import local_accounts as accounts
import game_control as game
import premium_store as store
import custom_skins as custom
import npc_services as npc
import online_world as world

class CustomSkins(ServerAudit):
    def fund(self):store.transact(self.admin,'grant',{'username':'audituser','amount':100000,'requestId':uuid.uuid4().hex})
    def buy(self,skin):return game.skin_action(self.user,{'job':1,'generation':self.generation,'action':'buy','id':skin['id'],'price':skin['price'],'requestId':uuid.uuid4().hex})
    def test_catalogue_published_once_and_admin_edits_are_preserved(self):
        snapshot=game.skins(self.user,1);published=[s for s in snapshot['catalog'] if s.get('customModel')];self.assertEqual(len(published),17)
        skin=next(s for s in game.skin_admin(self.admin) if s.get('customModel'))
        game.save_skin(self.admin,{'id':skin['id'],'name':'Edited','description':'Synthetic','price':1234,'enabled':False,'version':skin['version']})
        self.assertFalse(any(s['id']==skin['id'] for s in game.skins(self.user,1)['catalog']))
        with accounts.connection() as db:game.setup(db);self.assertEqual(__import__('json').loads(db.execute('SELECT data FROM skin_offers WHERE id=?',(skin['id'],)).fetchone()[0])['price'],1234)
    def test_purchase_equip_remove_do_not_change_weapon_attributes(self):
        self.fund();skin=next(s for s in custom.catalog() if s['id']=='sapphire-wp1-2');s=self.state();weapon=npc.item_instance(skin['look'],[]);s['inv']['equip']['weapon']=weapon;self.save(s);self.buy(skin)
        payload={'job':1,'generation':self.generation,'id':skin['id'],'action':'equip','requestId':uuid.uuid4().hex};r=game.skin_action(self.user,payload);self.assertEqual(r['skins']['equip']['arma'],skin['id']);self.assertEqual(accounts.load_state('audituser',1)['inv']['equip']['weapon'],weapon)
        game.skin_action(self.user,{**payload,'action':'remove','requestId':uuid.uuid4().hex});self.assertNotIn('arma',game.skins(self.user,1)['equip'])
    def test_wrong_family_or_hands_unowned_and_stale_price_rejected(self):
        self.fund();skin=next(s for s in custom.catalog() if s['id']=='sapphire-wa1-2');s=self.state();s['inv']['equip']['weapon']=npc.item_instance('WA118',[]);self.save(s)
        payload={'job':1,'generation':self.generation,'id':skin['id'],'action':'equip','requestId':uuid.uuid4().hex}
        with self.assertRaises(ValueError):game.skin_action(self.user,payload)
        self.buy(skin)
        with self.assertRaises(ValueError):game.skin_action(self.user,{**payload,'requestId':uuid.uuid4().hex})
        with self.assertRaises(ValueError):game.skin_action(self.user,{**payload,'action':'buy','price':0,'requestId':uuid.uuid4().hex})
    def test_online_packet_only_publishes_owned_compatible_custom_visual(self):
        self.fund();skin=next(s for s in custom.catalog() if s['id']=='sapphire-wp1-2');s=self.state();s['inv']['equip']['weapon']=npc.item_instance(skin['look'],[]);self.save(s);self.buy(skin)
        game.skin_action(self.user,{'job':1,'generation':self.generation,'action':'equip','id':skin['id'],'requestId':uuid.uuid4().hex})
        packet={'job':1,'field':2,'clientId':'a'*32,'generation':self.generation,'x':0,'y':0,'z':0}
        world.heartbeat(self.user,packet);self.assertEqual(world.PLAYERS['audituser']['packet']['customWeaponSkin'],skin['id'])
        s=accounts.load_state('audituser',1);s['savedAt']+=1;s['inv']['equip']['weapon']=npc.item_instance('WA101',[]);self.save(s);world.heartbeat(self.user,packet);self.assertNotIn('customWeaponSkin',world.PLAYERS['audituser']['packet'])
    def test_icons_are_whitelisted_and_every_native_proxy_matches_slot(self):
        for skin in custom.catalog():
            self.assertEqual(game.ITEMS[skin['look']]['slot'],'WEAPON_TWO' if skin['hands']==2 else 'WEAPON_ONE');self.assertTrue(custom.icon(skin['id']).startswith(b'<svg'))
        self.assertIsNone(custom.icon('../../private'))

for _name in list(vars(ServerAudit)):
    if _name.startswith('test_') and _name not in vars(CustomSkins):setattr(CustomSkins,_name,None)
del ServerAudit
