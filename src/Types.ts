export type Properties = Record<string, unknown>;

export type CSSValue = string | number;
export type CSSObject = Record<string, CSSValue | Record<string, CSSValue>>;
export type Style = Record<string, CSSValue>;

export type ReadyCallback = () => void;
