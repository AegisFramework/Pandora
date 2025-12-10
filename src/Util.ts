import { CSSObject } from './Types';

/**
 * Calls a function asynchronously and returns a Promise with its result
 * @param callable - The function to call
 * @param context - The context (this) to use when calling the function
 * @param args - Additional arguments to pass to the function
 */
export function callAsync<T>(callable: (...args: any[]) => T, context: any, ...args: any[]): Promise<T> {
  try {
    const result = callable.apply(context, args);
    return result instanceof Promise ? result : Promise.resolve(result);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Checks if a value is a lit-html TemplateResult
 * This allows Components to detect whether render() returned a string or a TemplateResult
 * and handle them appropriately.
 *
 * @param value - The value to check
 * @returns True if the value is a lit-html TemplateResult
 */
export function isTemplateResult(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    '_$litType$' in (value as object)
  );
}

/**
 * Converts a CSS object to a CSS string
 * @param object - The CSS object to convert
 * @param encapsulation - Optional selector to encapsulate the CSS
 * @param level - Current nesting level for indentation
 */
export function deserializeCSS(object: CSSObject, encapsulation: string = '', level: number = 0): string {
  const keys = Object.keys(object);
  let css = '';

  for (const key of keys) {
    const value = object[key];

    if (typeof value === 'object' && value !== null) {
      if (encapsulation && !key.startsWith('@')) {
        if (key.startsWith('&')) {
          css += `${key.replace(/&/g, encapsulation)} {\n`;
        } else {
          css += `${encapsulation} ${key} {\n`;
        }
      } else {
        css += `${key} {\n`;
      }

      const properties = Object.keys(value);
      for (const property of properties) {
        css += '\t'.repeat(level);
        const propValue = value[property];

        if (typeof propValue === 'object' && propValue !== null) {
          const temp: CSSObject = {};
          temp[property] = propValue;
          css += deserializeCSS(temp, encapsulation, level + 1);
        } else {
          css += `\t${property}: ${propValue};\n`;
        }
      }
      css += '}\n';
    } else {
      css += '\t'.repeat(level);
      css += `\t${key}: ${value};\n`;
    }
  }

  return css;
}