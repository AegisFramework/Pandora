export type Properties = Record<string, unknown>;

export type CSSValue = string | number;
export type CSSProperties = Record<string, CSSValue>;

export interface CSSObject {
  [key: string]: CSSValue | CSSProperties | CSSObject;
}

export type Style = CSSObject;

export type ReadyCallback = () => void;
