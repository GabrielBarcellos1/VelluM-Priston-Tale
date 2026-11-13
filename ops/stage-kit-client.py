from pathlib import Path
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
inv=stage/'sinInvenTory.premium-shop.staged.cpp'
s=inv.read_bytes().decode('latin1')
old='if (InvenItem[SelectInvenItemIndex-1].sItemInfo.CODE==(sinBI2|sin56)) { haCastleSkillUseFlag=0; return; } // Kit blocked until atomic redemption'
new='''if (InvenItem[SelectInvenItemIndex-1].sItemInfo.CODE==(sinBI2|sin56)) {
                int occupied=0;
                for(int j=0;j<INVENTORY_MAXITEM;++j) if(InvenItem[j].Flag) ++occupied;
                if (occupied>INVENTORY_MAXITEM-9) {
                    cMessageBox.ShowMessage(MESSAGE_OVER_SPACE);
                    return;
                }
                chaPremiumitem.UsePremiumItem(178);
            } // Kit Premium 30D server validates the authenticated item serial'''
assert s.count(old)==1
s=s.replace(old,new)
newfile=stage/'sinInvenTory.premium-shop.kit.staged.cpp'
newfile.write_bytes(s.encode('latin1'))
p=stage/'HaPremiumItem.premium-shop.staged.cpp'
s=p.read_bytes().decode('latin1')
old='\t\tcase 133:'
assert s.count(old)==1
s=s.replace(old,'\t\tcase 178: // Kit Premium - server handles atomic inventory rewards\n\t\t\thaCastleSkillUseFlag=1;\n\t\t\tbreak;\n'+old,1)
out=stage/'HaPremiumItem.premium-shop.kit.staged.cpp'
out.write_bytes(s.encode('latin1'))
print('KIT_CLIENT_USE_STAGED',newfile.stat().st_size,out.stat().st_size)
