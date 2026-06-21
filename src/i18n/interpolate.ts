type InterpolationValue = number | string;

export function interpolate(
  template: string,
  values: Record<string, InterpolationValue>,
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
