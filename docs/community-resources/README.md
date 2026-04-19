# Community Resources

A curated collection of essential tools, guides, and references for cybersecurity professionals, system administrators, and developers.

> **Note:** This list is inspired by [The Book of Secret Knowledge](https://github.com/trimstray/the-book-of-secret-knowledge) — a comprehensive resource for the security community.

---

## Table of Contents

- [CLI Tools](#cli-tools)
- [Network Tools](#network-tools)
- [Security & Hardening](#security--hardening)
- [Penetration Testing](#penetration-testing)
- [Web Security](#web-security)
- [Threat Intelligence](#threat-intelligence)
- [Learning & Documentation](#learning--documentation)
- [Communities & News](#communities--news)

---

## CLI Tools

### Shells & Terminal

| Tool | Description |
|------|-------------|
| [GNU Bash](https://www.gnu.org/software/bash/) | POSIX-compliant shell |
| [Zsh](https://www.zsh.org/) | Interactive shell with plugins |
| [Oh My ZSH!](https://ohmyz.sh/) | Zsh configuration framework |
| [Starship](https://github.com/starship/starship) | Cross-shell prompt |
| [tmux](https://github.com/tmux/tmux/wiki) | Terminal multiplexer |

### Text Editors

| Tool | Description |
|------|-------------|
| [Vim](https://www.vim.org/) | Modal text editor |
| [Neovim](https://neovim.io/) | Extensible Vim fork |
| [micro](https://github.com/zyedidia/micro) | Modern terminal editor |

### File Management

| Tool | Description |
|------|-------------|
| [ranger](https://github.com/ranger/ranger) | VIM-inspired file manager |
| [fd](https://github.com/sharkdp/fd) | Fast find alternative |
| [ncdu](https://dev.yorhel.nl/ncdu) | Disk usage analyzer |

---

## Network Tools

### Scanning & Discovery

| Tool | Description |
|------|-------------|
| [Nmap](https://nmap.org/) | Network discovery & security auditing |
| [RustScan](https://github.com/RustScan/RustScan) | Faster port scanner |
| [masscan](https://github.com/robertdavidgraham/masscan) | Fast Internet port scanner |
| [zmap](https://github.com/zmap/zmap) | Single-packet network scanner |

### Packet Analysis

| Tool | Description |
|------|-------------|
| [tcpdump](https://www.tcpdump.org/) | Command-line packet analyzer |
| [Wireshark](https://www.wireshark.org/) | Network protocol analyzer |
| [tshark](https://www.wireshark.org/docs/man-pages/tshark.html) | TTY Wireshark |
| [Scapy](https://scapy.net/) | Packet manipulation library |
| [Termshark](https://termshark.io/) | TUI for tshark |

### DNS Tools

| Tool | Description |
|------|-------------|
| [dnsdiag](https://github.com/farrokhi/dnsdiag) | DNS diagnostics |
| [fierce](https://github.com/mschwager/fierce) | DNS reconnaissance |
| [subfinder](https://github.com/subfinder/subfinder) | Subdomain discovery |
| [Amass](https://github.com/OWASP/Amass) | Subdomain enumeration |
| [massdns](https://github.com/blechschmidt/massdns) | High-performance DNS stub resolver |

### HTTP Tools

| Tool | Description |
|------|-------------|
| [curl](https://curl.haxx.se/) | HTTP client |
| [HTTPie](https://github.com/jakubroztocil/httpie) | User-friendly HTTP client |
| [wuzz](https://github.com/asciimoo/wuzz) | HTTP inspection |
| [gobuster](https://github.com/OJ/gobuster) | Directory busting |
| [wrk](https://github.com/wg/wrk) | HTTP benchmarking |
| [httplab](https://github.com/gchaincl/httplab) | Interactive HTTP server |

---

## Security & Hardening

### SSL/TLS

| Tool | Description |
|------|-------------|
| [testssl.sh](https://github.com/drwetter/testssl.sh) | TLS/SSL testing |
| [sslscan](https://github.com/rbsec/sslscan) | SSL cipher detection |
| [SSLyze](https://github.com/nabla-c0d3/sslyze) | SSL/TLS server scanning |
| [mkcert](https://github.com/FiloSottile/mkcert) | Local dev certificates |
| [Certbot](https://github.com/certbot/certbot) | Let's Encrypt automation |

### System Hardening

| Tool | Description |
|------|-------------|
| [Lynis](https://cisofy.com/lynis/) | Security auditing |
| [OSSiEC](https://github.com/dev-sec/) | Server hardening framework |
| [grapheneX](https://github.com/grapheneX/grapheneX) | Automated hardening |
| [auditd](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/6/html/security_guide/chap-system_auditing) | System auditing |

### Intrusion Detection

| Tool | Description |
|------|-------------|
| [OSSEC](https://www.ossec.net/) | HIDS |
| [Rkhunter](https://github.com/installation/rkhunter) | Rootkit detection |
| [LinEnum](https://github.com/rebootuser/LinEnum) | Linux enumeration |
| [PE-sieve](https://github.com/hasherezade/pe-sieve) | Malware detection |

---

## Penetration Testing

### Frameworks

| Tool | Description |
|------|-------------|
| [Metasploit](https://www.metasploit.com/) | Penetration testing framework |
| [Empire](https://github.com/BC-SECURITY/Empire) | Post-exploitation |
| [Covenant](https://github.com/cobbr/Covenant) | C2 framework |

### Exploitation

| Tool | Description |
|------|-------------|
| [Impacket](https://github.com/SecureAuthCorp/impacket) | Network protocols |
| [Responder](https://github.com/lgandx/Responder) | LLMNR/NBTNS poisoner |
| [BloodHound](https://github.com/BloodHoundAD/BloodHound) | AD enumeration |
| [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec) | Post-exploitation |

### Password Attacks

| Tool | Description |
|------|-------------|
| [Hashcat](https://hashcat.net/) | Password recovery |
| [John the Ripper](https://www.openwall.com/john/) | Password cracker |
| [Hydra](https://github.com/vanhauser-thc/thc-hydra) | Login cracker |

---

## Web Security

### SSL Labs & Headers

| Tool | Description |
|------|-------------|
| [SSL Labs Test](https://www.ssllabs.com/ssltest/) | SSL configuration test |
| [Security Headers](https://securityheaders.com/) | HTTP header analysis |
| [Mozilla Observatory](https://observatory.mozilla.org/) | Security scoring |
| [CSP Evaluator](https://csp-evaluator.withgoogle.com/) | CSP analysis |

### Web Scanning

| Tool | Description |
|------|-------------|
| [Nikto](https://github.com/sullo/nikto) | Web server scanner |
| [OWASP ZAP](https://www.zaproxy.org/) | Web app security testing |
| [Burp Suite](https://portswigger.net/burp) | Web security testing |

### Encoders & Utilities

| Tool | Description |
|------|-------------|
| [CyberChef](https://gchq.github.io/CyberChef/) | Encoding/decoding |
| [URL Encode/Decode](https://www.url-encode-decode.com/) | URL manipulation |
| [Regex101](https://regex101.com/) | Regex testing |

---

## Threat Intelligence

### IOC & Feeds

| Tool | Description |
|------|-------------|
| [VirusTotal](https://www.virustotal.com/) | Malware analysis |
| [AlienVault OTX](https://otx.alienvault.com/) | Threat pulses |
| [AbuseIPDB](https://www.abuseipdb.com/) | IP reputation |
| [ThreatFox](https://threatfox.abuse.ch/) | IOC database |

### DNS Security

| Tool | Description |
|------|-------------|
| [DNSDumpster](https://dnsdumpster.com/) | DNS recon |
| [DNSlytics](https://dnslytics.com/) | DNS analysis |
| [crt.sh](https://crt.sh/) | Certificate search |

---

## Learning & Documentation

### MITRE Frameworks

| Resource | Description |
|----------|-------------|
| [MITRE ATT&CK](https://attack.mitre.org/) | Adversarial tactics & techniques |
| [MITRE D3FEND](https://d3fend.mitre.org/) | Defensive countermeasures |
| [MITRE ATLAS](https://atlas.mitre.org/) | AI threat framework |
| [NIST CSF 2.0](https://www.nist.gov/cyberframework) | Cybersecurity framework |

### Cheat Sheets

| Resource | Description |
|----------|-------------|
| [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/) | Web security guides |
| [RSA Cheat Sheets](https://github.com/trimstray/the-book-of-secret-knowledge#other-cheat-sheets-toc) | Linux/Network guides |
| [Pentest Monkey](https://pentestmonkey.net/) | Pen testing guides |

### Books

| Title | Description |
|-------|-------------|
| The Pentester's Blueprin | Professional pentesting |
| Red Team Field Manual | RTFM for red teaming |
| The Hacker's Playbook | Practical security |

---

## Communities & News

### News Sources

| Resource | Description |
|----------|-------------|
| [Krebs on Security](https://krebsonsecurity.com/) | Brian Krebs security news |
| [The Hacker News](https://thehackernews.com/) | Security news |
| [BleepingComputer](https://www.bleepingcomputer.com/) | Tech & security |
| [Dark Reading](https://www.darkreading.com/) | Security insights |

### Forums & Communities

| Resource | Description |
|----------|-------------|
| [Reddit r/netsec](https://reddit.com/r/netsec) | Security community |
| [Reddit r/hacking](https://reddit.com/r/hacking) | Hacking discussion |
| [Stack Overflow](https://stackoverflow.com/) | Technical Q&A |

### Bug Bounty

| Platform | Description |
|----------|-------------|
| [HackerOne](https://www.hackerone.com/) | Bug bounty platform |
| [Bugcrowd](https://www.bugcrowd.com/) | Crowd-secured programs |
| [Open Bug Bounty](https://www.openbugbounty.org/) | Open bug reports |

---

## Contributing

To add resources to this list:

1. Fork the Zyra repository
2. Add your resource to the appropriate section
3. Submit a Pull Request

---

## License

Community Resources — Licensed under Apache 2.0

> *"Knowledge is powerful, be careful how you use it!"*