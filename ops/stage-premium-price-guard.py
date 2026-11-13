from pathlib import Path
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
file=stage/'OnSever.premium-shop.kit.staged.cpp'
source=file.read_bytes().decode('latin1').replace(chr(13)+chr(10),chr(10))
needle='int rsRecvBuyShopItem( rsPLAYINFO *lpPlayInfo  , TRANS_BUY_SHOPITEM *lpTransBuyShopItem )\n{\n\tint money;'
assert source.count(needle)==1
patch='''    // Premium Shop: reject price tampering, forged quantities and test-money mode.
    DWORD customCode = lpTransBuyShopItem->sItem.sItemInfo.CODE;
    if ((customCode&sinITEM_MASK2)==sinBI2 &&
        (customCode&sinITEM_MASK3)>=sin38 && (customCode&sinITEM_MASK3)<=sin56) {
        int ordinal=(customCode&sinITEM_MASK3)>>8;
        int expectedPrice = ordinal==56 ? 2500000 : ((ordinal&1) ? 350000 : 100000);
        if (!rsServerConfig.ServerInventoryMode || lpTransBuyShopItem->ItemCount!=1 ||
            lpTransBuyShopItem->sItem.sItemInfo.Price!=expectedPrice ||
            lpPlayInfo->ServerMoney<expectedPrice) return FALSE;
    }
'''
source=source.replace(needle,needle+'\n'+patch,1)
out=stage/'OnSever.premium-shop.price-guard.staged.cpp'
out.write_bytes(source.encode('latin1'))
print('PRICE_GUARD_STAGED',out.stat().st_size)
