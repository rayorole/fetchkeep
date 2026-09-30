# Parsing log lines with a state machine - Tidewater Docs
http://172.31.172.243:39953/tutorials/state-machine.html

# Parsing log lines with a state machine

This tutorial builds a tiny parser for lines such as `level=warn msg="disk almost full"`.

## The token type

```rust
enum Token<'a> {
    Key(&'a str),
    Value(&'a str),
}
```

## The loop

Each character moves the parser between three states. Quotes switch into a mode where spaces are kept.

```
for ch in line.chars() {
    match (state, ch) {
        (State::Key, '=') => state = State::Value,
        _ => buf.push(ch),
    }
}
```

## Testing it

```js
const out = parse('level=warn msg="disk almost full"');
console.assert(out.msg === "disk almost full");
```

Escaped quotes inside values are left as an exercise; the reference solution handles them with one extra state.