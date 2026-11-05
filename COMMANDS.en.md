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
`/limits width 4…16` sets the bar length in cells; the default is 8.

<p align="center"><img src="docs/commands/en-width.png" alt="/limits width 12 makes a 12-cell bar" width="85%"></p>

## Color thresholds
`/limits colors <yellow> <red>` sets the percentage at which the bar turns yellow and red. The default is 50 and 80: green below 50%, yellow below 80%, red above.

<p align="center"><img src="docs/commands/en-colors.png" alt="/limits colors 40 60: 45% is yellow, 62% is red" width="85%"></p>

The first number must be smaller than the second, both from 1 to 100. Otherwise the plugin shows the right format.

## Which windows to show
`/limits show both` shows both windows (default), `/limits show 5h` only the 5-hour session, `/limits show 7d` only the week.

<p align="center"><img src="docs/commands/en-show.png" alt="/limits show 7d keeps only the weekly limit" width="70%"></p>

## Reset time
`/limits time off` hides the reset time; `/limits time on` shows it again (default).

<p align="center"><img src="docs/commands/en-time.png" alt="/limits time off removes the reset time" width="75%"></p>

## Icons
`/limits icons nerd` turns on clock, calendar and refresh icons; `/limits icons off` turns them off. A Nerd Font is needed in the terminal — see [Icons](README.en.md#icons) in the plugin overview.

<p align="center"><img src="docs/commands/en-icons.png" alt="/limits icons nerd turns on Nerd Font icons" width="85%"></p>

## Language
`/limits lang en` / `ru` switches to English or Russian; `/limits lang auto` follows the system region settings (default).

<p align="center"><img src="docs/commands/en-lang.png" alt="/limits lang ru switches the bar to Russian" width="80%"></p>

## Exact values
`/limits debug` shows the percentages, the reset time, when the numbers last changed and when the plugin last checked them. Handy to compare the bar with `/usage`.

<p align="center"><img src="docs/commands/en-debug.png" alt="/limits debug shows the exact values" width="75%"></p>
