"""Upgrade the original Priston offline-account auth safely:
salted PBKDF2-SHA256 (150k iterations), migration upon successful legacy login,
safe new-account registration, no implicit ADM-account recreation.
"""
from pathlib import Path
from datetime import datetime
import shutil
p=Path(r'C:\inetpub\priston\[project]\src\SrcServer\OnSever.cpp')
source=p.read_bytes()
cr=b'\r\n'
old=b'#include <windows.h>\r\n'
new=old+b'#include <bcrypt.h>\r\n#pragma comment(lib, "bcrypt.lib")\r\n'
assert source.count(old)==1
source=source.replace(old,new,1)
begin=source.find(b'static BOOL OfflinePasswordOk( const char *szID , const char *szPassword )')
end=source.find(b'\r\nDWORD WINAPI LogAccountThreadProc',begin)
assert begin>=0 and end>begin
block=r'''// Hash upgrades are isolated from the character database. Existing accounts
// authenticate with their original password once and then migrate to PBKDF2.
static int HexValue( char c )
{
    if ( c>='0' && c<='9' ) return c-'0';
    if ( c>='a' && c<='f' ) return c-'a'+10;
    if ( c>='A' && c<='F' ) return c-'A'+10;
    return -1;
}
static int HexDecode( const char *s , unsigned char *out , int size )
{
    for ( int i=0; i<size; i++ ) {
        int h=HexValue(s[i*2]), l=HexValue(s[i*2+1]);
        if ( h<0 || l<0 ) return FALSE;
        out[i]=(unsigned char)((h<<4)|l);
    }
    return TRUE;
}
static void HexEncode( const unsigned char *in , int n , char *out )
{
    const char *hex="0123456789abcdef";
    for ( int i=0; i<n; i++ ) {
        out[i*2]=hex[in[i]>>4]; out[i*2+1]=hex[in[i]&15];
    }
    out[n*2]=0;
}
static int PasswordDerive( const char *password , unsigned char *salt , unsigned char *derived )
{
    BCRYPT_ALG_HANDLE algorithm=0;
    NTSTATUS st=BCryptOpenAlgorithmProvider(&algorithm,BCRYPT_SHA256_ALGORITHM,NULL,BCRYPT_ALG_HANDLE_HMAC_FLAG);
    if ( st<0 ) return FALSE;
    st=BCryptDeriveKeyPBKDF2(algorithm,(PUCHAR)password,(ULONG)lstrlen(password),salt,16,150000,derived,32,0);
    BCryptCloseAlgorithmProvider(algorithm,0);
    return st>=0;
}
static int PasswordRecordCreate( const char *password , char *result )
{
    unsigned char salt[16], digest[32];
    if ( BCryptGenRandom(NULL,salt,sizeof(salt),BCRYPT_USE_SYSTEM_PREFERRED_RNG)<0 ) return FALSE;
    if ( !PasswordDerive(password,salt,digest) ) return FALSE;
    lstrcpy(result,"P2$");
    HexEncode(salt,16,result+3);
    result[35]='$';
    HexEncode(digest,32,result+36);
    SecureZeroMemory(digest,sizeof(digest));
    return TRUE;
}
static int PasswordConstantMatch( const unsigned char *a , const unsigned char *b , int n )
{
    unsigned int diff=0;
    for(int i=0;i<n;i++) diff |= (unsigned int)(a[i]^b[i]);
    return diff==0;
}
static int PasswordRecordCheck( const char *password , const char *stored )
{
    if ( lstrlen(stored)!=100 || stored[0]!='P' || stored[1]!='2' ||
         stored[2]!='$' || stored[35]!='$' ) return FALSE;
    unsigned char salt[16], digest[32], actual[32];
    if ( !HexDecode(stored+3,salt,16) || !HexDecode(stored+36,digest,32) ) return FALSE;
    if ( !PasswordDerive(password,salt,actual) ) return FALSE;
    int ok=PasswordConstantMatch(digest,actual,32);
    SecureZeroMemory(actual,sizeof(actual));
    return ok;
}
static int PasswordRecordWrite( const char *path , const char *record , int newAccount )
{
    char temp[192];
    // Existing-account upgrades use atomic replacement; new IDs use CREATE_NEW
    // to avoid racing registrations overwriting one another's passwords.
    if ( newAccount ) {
        HANDLE file=CreateFileA(path,GENERIC_WRITE,0,NULL,CREATE_NEW,FILE_ATTRIBUTE_NORMAL,NULL);
        if ( file==INVALID_HANDLE_VALUE ) return FALSE;
        DWORD wrote=0, n=lstrlen(record);
        BOOL ok=WriteFile(file,record,n,&wrote,NULL) && wrote==n;
        FlushFileBuffers(file);CloseHandle(file);
        if(!ok)DeleteFileA(path);
        return ok;
    }
    wsprintf(temp,"%s.tmp",path);
    HANDLE file=CreateFileA(temp,GENERIC_WRITE,0,NULL,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,NULL);
    if ( file==INVALID_HANDLE_VALUE ) return FALSE;
    DWORD wrote=0,n=lstrlen(record);
    BOOL ok=WriteFile(file,record,n,&wrote,NULL) && wrote==n;
    FlushFileBuffers(file);CloseHandle(file);
    if ( !ok || !MoveFileExA(temp,path,MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH) ) {
        DeleteFileA(temp);
        return FALSE;
    }
    return TRUE;
}
static BOOL OfflinePasswordOk( const char *szID , const char *szPassword )
{
    if ( !szID || !szPassword ) return FALSE;
    int idLen=lstrlen(szID), passwordLen=lstrlen(szPassword);
    if ( idLen<3 || idLen>30 || passwordLen<1 || passwordLen>63 ) return FALSE;
    for ( int i=0; i<idLen; ++i ) {
        char c=szID[i];
        if ( !(c>='a'&&c<='z') && !(c>='A'&&c<='Z') &&
             !(c>='0'&&c<='9') && c!='_' && c!='-' ) return FALSE;
    }
    CreateDirectoryA("DataServer",NULL);
    CreateDirectoryA("DataServer\\password",NULL);
    char filename[160],stored[160]={0};
    wsprintf(filename,"DataServer\\password\\%s.pw",szID);
    FILE *fp=fopen(filename,"rb");
    if ( !fp ) {
        // Never let public users claim a staff ID if the record is missing.
        if ( lstrcmpi(szID,"adm")==0 || lstrcmpi(szID,"admin")==0 || passwordLen<8 )
            return FALSE;
        char record[112];
        if ( !PasswordRecordCreate(szPassword,record) ) return FALSE;
        if ( PasswordRecordWrite(filename,record,TRUE) ) return TRUE;
        fp=fopen(filename,"rb"); // possibly created by another login
        if ( !fp ) return FALSE;
    }
    int n=(int)fread(stored,1,sizeof(stored)-1,fp);
    fclose(fp);
    stored[n]=0;
    if ( stored[0]=='P' && stored[1]=='2' && stored[2]=='$' )
        return PasswordRecordCheck(szPassword,stored);
    // Legacy 16-hex-character hashes: verify existing password, then migrate.
    if ( n!=16 ) return FALSE;
    char legacy[32];
    OfflinePasswordHash(szID,szPassword,legacy);
    if ( lstrcmpi(legacy,stored)!=0 ) return FALSE;
    char upgraded[112];
    if ( PasswordRecordCreate(szPassword,upgraded) )
        PasswordRecordWrite(filename,upgraded,FALSE);
    return TRUE;
}
'''
replacement=block.replace('\n','\r\n').encode('ascii')
source=source[:begin]+replacement+source[end:]
backup=p.with_name(p.name+'.before-password-upgrade-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak')
shutil.copy2(p,backup);p.write_bytes(source)
print('PASSWORD_HARDENING_SOURCE_PREPARED',backup,'BYTES_DELTA',len(source)-backup.stat().st_size)