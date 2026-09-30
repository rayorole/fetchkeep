# Installing the toolchain

Tidewater ships as a single binary. You need a 64-bit operating system and about 200 megabytes of free disk space.

Note: older releases required a separate runtime. That is no longer necessary.

## Download

Use the installer script, then confirm that the binary is on your path:

```bash
curl -fsSL https://example.org/tidewater/install.sh | sh
tidewater --version
```

## Installer options

| Option | Default | Description |
| --- | --- | --- |
| `--prefix` | /usr/local | Directory that receives the binary |
| `--channel` | stable | Release channel to install from |
| `--no-modify-path` | off | Do not edit shell profile files |

## Verify the installation

```python
import tidewater

print(tidewater.version())
assert tidewater.ping() == "pong"
```

If the ping fails, run `tidewater doctor` and include its output when you report a problem.