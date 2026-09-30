# Configuration reference - Tidewater Docs
http://172.31.172.243:44735/docs/config.html

# Configuration reference

Tidewater reads `tidewater.toml` from the project root. Every key can also be set with an environment variable.

```
[server]
port = 8080
workers = 4
```

```shell
export TIDEWATER_SERVER_PORT=8080
export TIDEWATER_SERVER_WORKERS=4
```

## Keys

| Key | Type | Default |
| --- | --- | --- |
| server.port | integer | 8080 |
| server.workers | integer | number of CPU cores |
| log.format | string | text |

## Precedence

1. Command line flags
2. Environment variables
3. The configuration file
4. Built-in defaults

Values that cannot be parsed stop startup with an error that names the offending key.