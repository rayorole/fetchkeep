# Pressure sampler reference

Use the sampler only after the reference chamber reaches ambient temperature.

## Parameters

| Field | Type | Meaning |
| --- | --- | --- |
| interval | integer | Seconds between samples |
| unit | string | Output pressure unit |

## Example

```js
async function sample(sensor) {
  const value = await sensor.read();
  return { value, unit: "kPa" };
}
```

Store the raw reading before applying any calibration correction.

[Calibration procedure](http://172.31.172.243:45387/calibration.html)