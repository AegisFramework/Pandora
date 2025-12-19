import { CSSObject } from './Types';
/**
 * Calls a function asynchronously and returns a Promise with its result
 * @param callable - The function to call
 * @param context - The context (this) to use when calling the function
 * @param args - Additional arguments to pass to the function
 */
export declare function callAsync<T>(callable: (...args: any[]) => T, context: any, ...args: any[]): Promise<T>;
/**
 * Checks if a value is a lit-html TemplateResult
 * This allows Components to detect whether render() returned a string or a TemplateResult
 * and handle them appropriately.
 *
 * @param value - The value to check
 * @returns True if the value is a lit-html TemplateResult
 */
export declare function isTemplateResult(value: unknown): boolean;
/**
 * Converts a CSS object to a CSS string
 * @param object - The CSS object to convert
 * @param encapsulation - Optional selector to encapsulate the CSS
 * @param level - Current nesting level for indentation
 */
export declare function deserializeCSS(object: CSSObject, encapsulation?: string, level?: number): string;
//# sourceMappingURL=Util.d.ts.map