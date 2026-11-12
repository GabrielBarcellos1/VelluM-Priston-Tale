from pathlib import Path
from datetime import datetime
import os,subprocess
root=Path(r'C:\VelluM\priston-auth-test')
root.mkdir(exist_ok=True)
src=Path(r'C:\inetpub\priston\[project]\src\SrcServer\OnSever.cpp').read_bytes()
a=src.index(b'static void OfflinePasswordHash( ')
b=src.index(b'\r\nDWORD WINAPI LogAccountThreadProc',a)
impl=src[a:b].decode('cp1252')
prefix='''#define _CRT_SECURE_NO_WARNINGS
#define _WIN32_WINNT 0x0601
#include <windows.h>
#include <bcrypt.h>
#include <stdio.h>
#include <string.h>
#pragma comment(lib,"bcrypt.lib")
'''
tail=r'''
static int expect(bool value, const char *test) {
  if (!value) { printf("FAIL %s\n",test); return 1; }
  printf("PASS %s\n",test);return 0;
}
int main(){
  CreateDirectoryA("DataServer",NULL);
  CreateDirectoryA("DataServer\\password",NULL);
  int failures=0;
  const char *strong="StrongTestPassword2026!";
  failures+=expect(OfflinePasswordOk("tester1",strong),"register new account");
  FILE *f=fopen("DataServer\\password\\tester1.pw","rb");
  char s[160]={0};int n=0;if(f){n=(int)fread(s,1,159,f);fclose(f);}
  failures+=expect(n==100 && s[0]=='P' && s[1]=='2' && s[2]=='$',"new account PBKDF2 record");
  failures+=expect(strstr(s,strong)==NULL,"stored record contains no plaintext");
  failures+=expect(!OfflinePasswordOk("tester1","WrongTestPassword!"),"wrong password rejected");
  failures+=expect(OfflinePasswordOk("tester1",strong),"correct password accepted");
  failures+=expect(!OfflinePasswordOk("admin","AttackerPassword2026!"),"unclaimed admin reserved");
  failures+=expect(!OfflinePasswordOk("adm","AttackerPassword2026!"),"unclaimed ADM reserved");
  failures+=expect(!OfflinePasswordOk("../path",strong),"path traversal rejected");
  failures+=expect(!OfflinePasswordOk("ab",strong),"short account rejected");
  failures+=expect(!OfflinePasswordOk("another","123"),"new short password rejected");
  char legacy[32];OfflinePasswordHash("oldplayer","LegacyTestPassword!",legacy);
  f=fopen("DataServer\\password\\oldplayer.pw","wb");
  if(!f) return 7;fwrite(legacy,1,16,f);fclose(f);
  failures+=expect(!OfflinePasswordOk("oldplayer","WrongTestPassword!"),"legacy wrong password rejected");
  failures+=expect(OfflinePasswordOk("oldplayer","LegacyTestPassword!"),"legacy correct password accepted");
  f=fopen("DataServer\\password\\oldplayer.pw","rb");
  memset(s,0,sizeof(s));n=0;if(f){n=(int)fread(s,1,159,f);fclose(f);}
  failures+=expect(n==100 && s[0]=='P',"legacy password migrated to PBKDF2");
  failures+=expect(OfflinePasswordOk("oldplayer","LegacyTestPassword!"),"migrated account still authenticates");
  failures+=expect(!OfflinePasswordOk("oldplayer","WrongTestPassword!"),"migrated wrong password rejected");
  printf("AUTH_TEST_RESULT=%s FAILURES=%d\n",failures?"FAILED":"OK",failures);
  return failures?1:0;
}
'''
(root/'auth_tests.cpp').write_text(prefix+impl+tail,'cp1252')
print('AUTH_HARNESS_READY',root/'auth_tests.cpp',len(prefix+impl+tail))