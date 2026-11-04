<p align="center">
  <a href="https://github.com/IlTsPe/limits-for-claude"><img src="mascot.png" alt="Limits for Claude mascot: a cat in headphones with a clock and a calendar" width="50%"></a>
</p>

<h1 align="center">Limits for Claude</h1>

<p align="center"><a href="README.md">Русский</a> · <b>English</b></p>

<p align="center">
  <a href="#about">About</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#commands">Commands</a> ·
  <a href="#language">Language</a> ·
  <a href="#skins">Skins</a> ·
  <a href="#icons">Icons</a> ·
  <a href="#limitations">Limitations</a> ·
  <a href="#update-and-removal">Update and removal</a> ·
  <a href="#support-the-project">Support the project</a> ·
  <a href="#license">License</a>
</p>

## About
A [Claude Code](https://claude.com/claude-code) plugin that shows your subscription usage right above the prompt. No more typing `/usage` every time you want to know how much is left.

```
5h ━━━━━━━━ 13% · ↕ 3:10 pm   7d ━━━━━━━━ 38% · ↕ Sat 5 pm
```

What the bar shows:
- **5h** — usage of the five-hour session;
- **7d** — usage of the weekly limit;
- usage percentage — the filled part changes color: green below 50%, yellow below 80%, red above;
- limit reset time — when the limit starts over: "3:10 pm" if it is today, "tomorrow 2:50 am" if tomorrow, or the day of the week, such as "Sat 5 pm". The time zone and time format come from your Windows region settings (Settings → Time & language → Region): a 12-hour format gives "3:10 pm", a 24-hour format gives "15:10".

The bar updates on its own after every Claude reply. At startup, before the first reply, it shows the last known numbers marked "(last session)".

## Installation
At the Claude Code prompt:

```
/plugin install usage-limits --marketplace IlTsPe/limits-for-claude
```

Answer `y` to `Add marketplace?`, then pick the install scope (the default is your user, i.e. every project) and press Enter.

From a regular terminal, the same in one command:

```
claude plugin install usage-limits --marketplace IlTsPe/limits-for-claude
```

In the Claude desktop app: "+" next to the prompt → Plugins → Add marketplace → `IlTsPe/limits-for-claude` → Add plugin.

## Commands
Type all commands at the Claude Code prompt.

| Command | What it does |
| --- | --- |
| `/limits` | Hide or show the bar. The choice is remembered between launches |
| `/limits skin` | List the skins with a preview; the current one is marked `●` |
| `/limits skin <number or name>` | Choose a skin, e.g. `/limits skin 4` or `/limits skin blocks` |
| `/limits icons` | Show whether icons are on |
| `/limits icons nerd` | Turn on Nerd Font icons (clock, calendar, refresh arrow) |
| `/limits icons off` | Turn icons off |
| `/limits lang` | Show the current language |
| `/limits lang en` / `ru` | Switch to English or Russian |
| `/limits lang auto` | Language from the system region settings (default) |

You can also collapse the bar with the Claude Code shortcut **Ctrl+X**, then **Ctrl+A**.

## Language
The plugin speaks English and Russian. The language is picked automatically from your Windows region settings (Settings → Time & language → Region), or from the `LANG` variable on macOS and Linux: a Russian region gives Russian, any other gives English. The Windows display language does not matter.

| | English | Русский |
| --- | --- | --- |
| Bar | `5h ━━━━━━━━ 13% · ↕ 3:10 pm` | `5ч ━━━━━━━━ 13% · ↕ 15:10` |
| Tomorrow | `↕ tomorrow 2:50 am` | `↕ завтра 2:50` |
| Another day | `↕ Sat 5 pm` | `↕ сб 17:00` |

The time follows your system time format, not the language: with a 24-hour format, English shows `Sat 17:00`. To choose the language yourself, use `/limits lang en` or `/limits lang ru`; to go back to automatic, `/limits lang auto`.

## Skins
A skin changes how the bar looks. All skins work with the standard fonts of Windows, macOS and Linux.

| # | Name | Look |
| --- | --- | --- |
| 1 | `line` — thick line (default) | `━━━━━━━━` |
| 2 | `thin` — thin line | `────────` |
| 3 | `double` — double line | `════════` |
| 4 | `blocks` — blocks | `███░░░░░` |
| 5 | `squares` — squares | `■■■■■■■■` |
| 6 | `dots` — dots | `•••·····` |

## Icons
By default the plugin uses only characters that every font has. For nicer icons (a clock, a calendar and a refresh arrow) you need a font from the [Nerd Fonts](https://www.nerdfonts.com/) family:

1. Download and install any Nerd Font, for example [JetBrainsMono Nerd Font](https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip). Pick the **Mono** variant (on Windows it is named, for example, "JetBrainsMono NFM"): all its icons are one cell wide, so the line does not shift.
2. Select that font in your terminal:
   - **PowerShell and cmd** — right-click the window title → Properties → Font;
   - **VS Code** — in `settings.json`: `"terminal.integrated.fontFamily": "'JetBrainsMono NFM'"`;
   - **Git Bash** — right-click the window → Options → Text → Font;
   - **Windows Terminal, iTerm2 and others** — in the profile settings.
3. Turn the icons on: `/limits icons nerd`.

If you see boxes instead of icons, the terminal font is not a Nerd Font. Turn the icons off with `/limits icons off`.

## Limitations
- Works when you sign in to Claude Code with a Claude subscription (Pro, Max). With an API key there are no "5 hours / week" limits, so the bar stays empty.
- The bar shows in Claude Code in a terminal (PowerShell, cmd, Git Bash, the VS Code terminal, Windows Terminal, iTerm2, etc.) and in the desktop app. It does not show in the Claude Code extension panel for VS Code, in the browser or in the mobile app; use `/usage` there.
- On Windows, the time format (12 or 24 hours) and the time zone come from the system settings. On macOS and Linux the time is shown in the 24-hour format in the system time zone.
- The plugin uses the Claude Code plugin API, which is still in early access. After major Claude Code updates the plugin may need an update.

## Update and removal
Update to the latest version:

```
claude plugin update usage-limits@limits-for-claude
```

Restart Claude Code after the update.

Remove:

```
claude plugin uninstall usage-limits@limits-for-claude
```

## Support the project
The plugin is free. If it helps you and you want to thank the author, support the project on [DonationAlerts](https://www.donationalerts.com/r/pegasusil). It helps keep the plugin going and make new ones.

Found a bug or have an idea? Open an [issue](https://github.com/IlTsPe/limits-for-claude/issues).

## License
© 2026 Ilya Tsygankov, all rights reserved. You may install and use the plugin for free; you may not sell it or modified versions of it. See [LICENSE](LICENSE) for details.

Claude and Claude Code are Anthropic products. This plugin is an independent project and is not affiliated with Anthropic.
