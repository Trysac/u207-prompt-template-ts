export type VariableType = "string" | "number" | "list";

export interface TemplateVariable {
  readonly name: string;
  readonly type: VariableType;
}

export interface Template<S extends string> {
  readonly source: S;
  readonly variables: ReadonlyArray<TemplateVariable>;
  render(vars: VarsOf<S>): string;
}

export class TemplateError extends Error {
  readonly code: "syntax" | "missing_variable" | "unknown_variable" | "invalid_type" | "too_large";

  constructor(code: TemplateError["code"], message: string) {
    super(message);
    this.name = "TemplateError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Type-level parsing: extract placeholders from the template literal and
// build the corresponding variable object type.
// ---------------------------------------------------------------------------

type ParsedVar = { name: string; type: VariableType };

type ParseVar<Content extends string> = Content extends `${infer Name}:${infer Type}`
  ? Type extends VariableType
    ? { name: Name; type: Type }
    : never
  : { name: Content; type: "string" };

type Parse<
  S extends string,
  Acc extends readonly ParsedVar[] = [],
> = S extends `${string}{{${infer Content}}}${infer Rest}`
  ? Parse<Rest, [...Acc, ParseVar<Content>]>
  : Acc;

type VariableTypeToTs<T extends VariableType> = T extends "string"
  ? string
  : T extends "number"
    ? number
    : T extends "list"
      ? readonly string[]
      : never;

type ToObject<T extends readonly ParsedVar[]> = {
  [V in T[number] as V["name"]]: VariableTypeToTs<V["type"]>;
};

export type VarsOf<S extends string> =
  Parse<S> extends readonly [] ? Record<string, never> : ToObject<Parse<S>>;

// ---------------------------------------------------------------------------
// Runtime implementation
// ---------------------------------------------------------------------------

type Segment =
  | { readonly kind: "literal"; readonly text: string }
  | { readonly kind: "variable"; readonly name: string; readonly type: VariableType };

function parsePlaceholder(
  source: string,
  start: number,
): { end: number; name: string; type: VariableType } {
  let pos = start + 2;
  if (pos >= source.length) {
    throw new TemplateError("syntax", `unclosed placeholder at index ${start}`);
  }
  const first = source.charAt(pos);
  if (!/[A-Za-z_]/.test(first)) {
    throw new TemplateError("syntax", `invalid placeholder at index ${start}`);
  }
  let name = first;
  pos++;
  while (pos < source.length && /[A-Za-z0-9_]/.test(source.charAt(pos))) {
    if (name.length >= 64) {
      throw new TemplateError("syntax", `invalid placeholder at index ${start}`);
    }
    name += source.charAt(pos);
    pos++;
  }

  let type: VariableType = "string";
  if (pos < source.length && source[pos] === ":") {
    pos++;
    const typeToken = (["string", "number", "list"] as const).find((t) =>
      source.startsWith(t, pos),
    );
    if (!typeToken) {
      throw new TemplateError("syntax", `invalid placeholder at index ${start}`);
    }
    type = typeToken;
    pos += typeToken.length;
  }

  if (pos + 1 >= source.length || source[pos] !== "}" || source[pos + 1] !== "}") {
    if (pos >= source.length) {
      throw new TemplateError("syntax", `unclosed placeholder at index ${start}`);
    }
    throw new TemplateError("syntax", `invalid placeholder at index ${start}`);
  }
  return { end: pos + 2, name, type };
}

function parseTemplate(source: string): { variables: TemplateVariable[]; segments: Segment[] } {
  const variables: TemplateVariable[] = [];
  const varIndex = new Map<string, VariableType>();
  const segments: Segment[] = [];
  let pos = 0;

  while (pos < source.length) {
    const open = source.indexOf("{{", pos);
    if (open === -1) {
      segments.push({ kind: "literal", text: source.slice(pos) });
      break;
    }
    if (open > pos) {
      segments.push({ kind: "literal", text: source.slice(pos, open) });
    }
    const parsed = parsePlaceholder(source, open);
    const existingType = varIndex.get(parsed.name);
    if (existingType !== undefined) {
      if (existingType !== parsed.type) {
        throw new TemplateError("syntax", `conflicting type for variable '${parsed.name}'`);
      }
    } else {
      if (variables.length >= 100) {
        throw new TemplateError("syntax", "too many distinct variables (max 100)");
      }
      variables.push({ name: parsed.name, type: parsed.type });
      varIndex.set(parsed.name, parsed.type);
    }
    segments.push({ kind: "variable", name: parsed.name, type: parsed.type });
    pos = parsed.end;
  }

  return { variables, segments };
}

function validateVars(variables: readonly TemplateVariable[], vars: Record<string, unknown>): void {
  if (typeof vars !== "object" || vars === null || Array.isArray(vars)) {
    throw new TemplateError("invalid_type", "vars must be a plain object");
  }
  const proto = Object.getPrototypeOf(vars);
  if (proto !== Object.prototype && proto !== null) {
    throw new TemplateError("invalid_type", "vars must be a plain object");
  }
  for (const v of variables) {
    if (!Object.hasOwn(vars, v.name)) {
      throw new TemplateError("missing_variable", `missing variable: ${v.name}`);
    }
  }
  for (const key of Object.keys(vars)) {
    if (!variables.some((v) => v.name === key)) {
      throw new TemplateError("unknown_variable", `unknown variable: ${key}`);
    }
  }
  for (const v of variables) {
    const val = vars[v.name];
    switch (v.type) {
      case "string":
        if (typeof val !== "string") {
          throw new TemplateError("invalid_type", `invalid type for ${v.name}: expected string`);
        }
        break;
      case "number":
        if (typeof val !== "number" || !Number.isFinite(val)) {
          throw new TemplateError(
            "invalid_type",
            `invalid type for ${v.name}: expected finite number`,
          );
        }
        break;
      case "list":
        if (!Array.isArray(val)) {
          throw new TemplateError(
            "invalid_type",
            `invalid type for ${v.name}: expected string array`,
          );
        }
        for (let i = 0; i < val.length; i++) {
          if (typeof val[i] !== "string") {
            throw new TemplateError(
              "invalid_type",
              `invalid type for ${v.name}: expected string array`,
            );
          }
        }
        break;
    }
  }
}

function renderValue(value: unknown, type: VariableType): string {
  switch (type) {
    case "string":
      return value as string;
    case "number":
      return String(value as number);
    case "list": {
      const arr = value as readonly string[];
      if (arr.length === 0) return "";
      return arr.map((item) => `- ${item}`).join("\n");
    }
  }
}

class TemplateImpl<S extends string> implements Template<S> {
  readonly source: S;
  readonly variables: ReadonlyArray<TemplateVariable>;
  private readonly segments: ReadonlyArray<Segment>;
  private readonly maxOutputChars: number;

  constructor(source: S, maxOutputChars: number) {
    if (source.length > 100_000) {
      throw new TemplateError("too_large", "template source exceeds 100000 characters");
    }
    this.source = source;
    this.maxOutputChars = maxOutputChars;
    const parsed = parseTemplate(source);
    this.variables = parsed.variables;
    this.segments = parsed.segments;
  }

  render(vars: VarsOf<S>): string {
    const varsObj = vars as unknown as Record<string, unknown>;
    validateVars(this.variables, varsObj);
    let result = "";
    for (const segment of this.segments) {
      if (segment.kind === "literal") {
        result += segment.text;
      } else {
        result += renderValue(varsObj[segment.name], segment.type);
      }
    }
    if (result.length > this.maxOutputChars) {
      throw new TemplateError(
        "too_large",
        `rendered output exceeds ${this.maxOutputChars} characters`,
      );
    }
    return result;
  }
}

export function template<S extends string>(
  source: S,
  opts?: { maxOutputChars?: number },
): Template<S> {
  const max = opts?.maxOutputChars ?? 1_000_000;
  return new TemplateImpl(source, max);
}
