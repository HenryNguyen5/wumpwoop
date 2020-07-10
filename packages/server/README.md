# wumpwoop

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/wumpwoop.svg)](https://npmjs.org/package/wumpwoop)
[![Downloads/week](https://img.shields.io/npm/dw/wumpwoop.svg)](https://npmjs.org/package/wumpwoop)
[![License](https://img.shields.io/npm/l/wumpwoop.svg)](https://github.com/HenryNguyen5/wumpwoop/blob/master/package.json)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g wumpwoop
$ ww COMMAND
running command...
$ ww (-v|--version|version)
wumpwoop/0.0.1 darwin-x64 node-v12.16.2
$ ww --help [COMMAND]
USAGE
  $ ww COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`ww hello [FILE]`](#ww-hello-file)
- [`ww help [COMMAND]`](#ww-help-command)

## `ww hello [FILE]`

describe the command here

```
USAGE
  $ ww hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ ww hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/HenryNguyen5/wumpwoop/blob/v0.0.1/src/commands/hello.ts)_

## `ww help [COMMAND]`

display help for ww

```
USAGE
  $ ww help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.1.0/src/commands/help.ts)_

<!-- commandsstop -->
