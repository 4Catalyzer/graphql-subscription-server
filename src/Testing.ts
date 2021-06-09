const cache = new Map<string, unknown[]>();

export function getLabel(key: string, value: unknown) {
  const values: any[] = cache.get(key) || [];
  cache.set(key, values);

  if (!values.includes(value)) values.push(value);
  return `<${key[0].toUpperCase()}${key.slice(1)}:${
    values.indexOf(value) + 1
  }>`;
}

getLabel.clearCache = () => cache.clear();

export function maskNonDeterministicValues(meta: any, maskKeys: string[]) {
  if (!meta || typeof meta !== 'object') return meta;

  const result: any = {};
  for (const [key, value] of Object.entries(meta)) {
    if (maskKeys.includes(key)) {
      result[key] = getLabel(key, value);
    } else if (Array.isArray(value))
      result[key] = value.map((i) => maskNonDeterministicValues(i, maskKeys));
    else {
      result[key] = maskNonDeterministicValues(value, maskKeys);
    }
  }

  return result;
}

maskNonDeterministicValues.clearCache = getLabel.clearCache;
