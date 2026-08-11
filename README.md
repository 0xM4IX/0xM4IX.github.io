# 0xM4IX.github.io

Source code for **[0xm4ix.com](https://0xm4ix.com/)** — a personal offensive security blog built with [Hugo](https://gohugo.io/) and deployed via GitHub Pages.

Offensive security research, Active Directory abuse, HackTheBox writeups, privilege escalation, vulnerability research, and real-world exploitation methodologies.

## About

I'm **0xM4IX**, a penetration tester from Uzbekistan and a former software engineer, focused on offensive security, Active Directory, web application security, and internal network assessments. This site is my personal knowledge base — penetration testing techniques, machine writeups, vulnerability research, and notes from ongoing learning.

**Certifications:** CPTS (Certified Penetration Testing Specialist), eJPT (eLearnSecurity Junior Penetration Tester) — currently preparing for OSCP.

## What's Here

- Penetration testing writeups (HackTheBox, CTF environments)
- Active Directory abuse & privilege escalation research
- Web application security notes
- Vulnerability research
- Tools, tips, and technical references
- Cheatsheets and learning resources

## Tech Stack

- **Static site generator:** [Hugo](https://gohugo.io/)
- **Hosting:** GitHub Pages
- **Languages:** CSS, HTML, JavaScript

## Project Structure

```
.
├── archetypes/     # Hugo content templates
├── assets/         # Site assets (styles, images, etc.)
├── content/        # Site content (posts, writeups, pages)
├── layouts/        # Hugo layout templates
├── static/         # Static files served as-is
├── themes/         # Hugo theme(s)
├── hugo.toml       # Hugo site configuration
└── package.json    # Node dependencies (e.g. build tooling)
```

## Running Locally

**Prerequisites:** [Hugo](https://gohugo.io/installation/) (extended version) and Git.

```bash
# Clone the repository (with submodules for the theme)
git clone --recurse-submodules https://github.com/0xM4IX/0xM4IX.github.io.git
cd 0xM4IX.github.io

# Install any Node dependencies (if used for search/build tooling)
npm install

# Start the local dev server
hugo server -D
```

The site will be available at `http://localhost:1313/`.

## Building

```bash
hugo --minify
```

Output is generated into the `public/` directory.

## Deployment

The site is automatically built and deployed to GitHub Pages via GitHub Actions (`.github/workflows`) on every push to `main`.

## Links

- 🌐 Website: [0xm4ix.com](https://0xm4ix.com/)
- 📝 Posts: [0xm4ix.com/posts](https://0xm4ix.com/posts)
- 🎯 Writeups: [0xm4ix.com/writeups](https://0xm4ix.com/writeups/)
- 🏷️ Tags: [0xm4ix.com/tags](https://0xm4ix.com/tags/)

## License

No license specified. All rights reserved unless stated otherwise.

---

> *"The best way to learn offensive security is through continuous practice, disciplined research, and sharing knowledge with the community."*
