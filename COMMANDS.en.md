<h1 align="center">Usage Limits Bar commands</h1>

<p align="center"><a href="COMMANDS.md">Русский</a> · <b>English</b> · <a href="README.en.md">← back to the plugin overview</a></p>

<p align="center">
  <a href="#show-and-hide-the-bar">Show / hide</a> ·
  <a href="#skins">Skins</a> ·
  <a href="#bar-length">Length</a> ·
  <a href="#color-thresholds">Colors</a> ·
  <a href="#which-windows-to-show">Windows</a> ·
  <a href="#reset-time">Reset time</a> ·
  <a href="#icons">Icons</a> ·
  <a href="#language">Language</a> ·
  <a href="#exact-values">Exact values</a>
</p>

Type all commands at the Claude Code prompt. Any command without a value shows the current setting and a hint, for example `/limits width` → "Bar length: 8 cells. Change: /limits width 4…16". All settings are remembered between launches.

The pictures show an example: the 5-hour session is 36% used, the week is 50% used.

## Show and hide the bar
`/limits` hides the bar; run `/limits` again to show it.

<p align="center"><img src="docs/commands/en-toggle.png" alt="/limits hides the bar" width="70%"></p>

You can also collapse the bar with the Claude Code shortcut **Ctrl+X**, then **Ctrl+A**.

## Skins
`/limits skin` lists the skins with a preview; the current one is marked `●`.

<p align="center"><img src="docs/commands/en-skin-list.png" alt="/limits skin lists the skins" width="85%"></p>

`/limits skin <number or name>` chooses a skin, for example `/limits skin 4` or `/limits skin blocks`.

<p align="center"><img src="docs/commands/en-skin-set.png" alt="/limits skin 4 turns on the blocks skin" width="85%"></p>

## Bar length
`/limits width 4…16` sets the bar length in cells; the default is 8. A longer bar shows usage more precisely but takes more room.

**4 — the shortest**

<p align="center"><img src="docs/commands/en-width-4.png" alt="/limits width 4" width="585"></p>

**8 — default**

<p align="center"><img src="docs/commands/en-width-8.png" alt="/limits width 8" width="669"></p>

**16 — the longest**

<p align="center"><img src="docs/commands/en-width-16.png" alt="/limits width 16" width="837"></p>

## Color thresholds
`/limits colors <yellow> <red>` sets the percentage at which the bar turns yellow and red. The brackets say what color each window is in the picture.

**50 and 80 — default: green below 50%, yellow below 80%, red above** (45% is green, 75% is yellow)

<p align="center"><img src="docs/commands/en-colors-50-80.png" alt="/limits colors 50 80" width="788"></p>

**70 and 90 — calmer: green below 70%, yellow below 90%, red above** (68% is still green, 85% is still yellow; with the default thresholds they would be yellow and red)

<p align="center"><img src="docs/commands/en-colors-70-90.png" alt="/limits colors 70 90" width="788"></p>

**30 and 60 — stricter: yellow from 30%, red from 60%** (45% is yellow, 75% is red)

<p align="center"><img src="docs/commands/en-colors-30-60.png" alt="/limits colors 30 60" width="788"></p>

The first number must be smaller than the second, both from 1 to 100. Otherwise the plugin shows the right format.

## Which windows to show
`/limits show <value>` chooses which limits the bar shows.

**`both` — both windows (default)**

<p align="center"><img src="docs/commands/en-show-both.png" alt="/limits show both" width="669"></p>

**`5h` — the 5-hour session only**

<p align="center"><img src="docs/commands/en-show-5h.png" alt="/limits show 5h" width="378"></p>

**`7d` — the week only**

<p align="center"><img src="docs/commands/en-show-7d.png" alt="/limits show 7d" width="378"></p>

## Reset time
`/limits time <value>` chooses whether to show when the limit starts over.

**`on` — show (default)**

<p align="center"><img src="docs/commands/en-time-on.png" alt="/limits time on" width="669"></p>

**`off` — hide**

<p align="center"><img src="docs/commands/en-time-off.png" alt="/limits time off" width="420"></p>

## Icons
`/limits icons nerd` turns on clock, calendar and refresh icons; `/limits icons off` turns them off. A Nerd Font is needed in the terminal — see [Icons](README.en.md#icons) in the plugin overview.

<p align="center"><img src="docs/commands/en-icons.png" alt="/limits icons nerd turns on Nerd Font icons" width="85%"></p>

## Language
`/limits lang en` / `ru` switches to English or Russian; `/limits lang auto` follows the system region settings (default).

**`en` — English**

<p align="center"><img src="docs/commands/en-lang-en.png" alt="/limits lang en" width="669"></p>

**`ru` — Russian**

<p align="center"><img src="docs/commands/en-lang-ru.png" alt="/limits lang ru" width="648"></p>

## Exact values
`/limits debug` shows the percentages, the reset time, when the numbers last changed and when the plugin last checked them. Handy to compare the bar with `/usage`.

<p align="center"><img src="docs/commands/en-debug.png" alt="/limits debug shows the exact values" width="75%"></p>
