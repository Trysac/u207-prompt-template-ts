import { describe, expect, it } from "vitest";
import { type Template, TemplateError, template, type VarsOf } from "../src/index.js";

function renderRaw<S extends string>(t: Template<S>, vars: unknown): string {
  return t.render(vars as VarsOf<S>);
}

describe("template()", () => {
  it("renders a string with string and number variables", () => {
    const t = template("Hi {{name}}, you have {{count:number}} items");
    expect(t.render({ name: "Ana", count: 3 })).toBe("Hi Ana, you have 3 items");
    expect(t.variables).toEqual([
      { name: "name", type: "string" },
      { name: "count", type: "number" },
    ]);
  });

  it("renders list variables as bullet lines", () => {
    const t = template("Rules:\n{{rules:list}}");
    expect(t.render({ rules: ["a", "b"] })).toBe("Rules:\n- a\n- b");
    expect(t.render({ rules: [] })).toBe("Rules:\n");
  });

  it("does not recursively interpret inserted values", () => {
    const t = template("Hi {{name}}, you have {{count:number}} items");
    expect(t.render({ name: "{{count}}", count: 1 })).toBe("Hi {{count}}, you have 1 items");
  });

  it("accepts exactly 100_000 characters and rejects 100_001", () => {
    const okSource = "x".repeat(100_000);
    expect(() => template(okSource)).not.toThrow();
    const badSource = "x".repeat(100_001);
    expect(() => template(badSource)).toThrowError(TemplateError);
    try {
      template(badSource);
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      expect((err as TemplateError).code).toBe("too_large");
    }
  });

  it("enforces maxOutputChars", () => {
    const t = template("{{x}}", { maxOutputChars: 5 });
    expect(() => t.render({ x: "123456" })).toThrowError(TemplateError);
    try {
      t.render({ x: "123456" });
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      expect((err as TemplateError).code).toBe("too_large");
    }
  });

  it("rejects syntax with invalid placeholder", () => {
    expect(() => template("Hi {{ name }}")).toThrowError(TemplateError);
    try {
      template("Hi {{ name }}");
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      const te = err as TemplateError;
      expect(te.code).toBe("syntax");
      expect(te.message).toContain("invalid placeholder at index 3");
    }
  });

  it("rejects unclosed placeholder", () => {
    expect(() => template("Hi {{name")).toThrowError(TemplateError);
    try {
      template("Hi {{name");
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      const te = err as TemplateError;
      expect(te.code).toBe("syntax");
      expect(te.message).toContain("unclosed placeholder at index 3");
    }
  });

  it("rejects unsupported type", () => {
    expect(() => template("{{x:date}}")).toThrowError(TemplateError);
    try {
      template("{{x:date}}");
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      expect((err as TemplateError).code).toBe("syntax");
    }
  });

  it("rejects conflicting types for same variable", () => {
    expect(() => template("{{a}} {{a:number}}")).toThrowError(TemplateError);
    try {
      template("{{a}} {{a:number}}");
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      const te = err as TemplateError;
      expect(te.code).toBe("syntax");
      expect(te.message).toContain("conflicting type for variable 'a'");
    }
  });

  it("rejects more than 100 distinct variables", () => {
    let source = "";
    for (let i = 0; i <= 100; i++) {
      source += `{{v${i}}}`;
    }
    expect(() => template(source)).toThrowError(TemplateError);
    try {
      template(source);
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      expect((err as TemplateError).code).toBe("syntax");
    }
  });

  it("throws missing_variable when a declared variable is absent", () => {
    const t = template("Hi {{name}}, you have {{count:number}} items");
    expect(() => renderRaw(t, { name: "Ana" })).toThrowError(TemplateError);
    try {
      renderRaw(t, { name: "Ana" });
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      const te = err as TemplateError;
      expect(te.code).toBe("missing_variable");
      expect(te.message).toContain("missing variable: count");
    }
  });

  it("throws unknown_variable for extra keys", () => {
    const t = template("Hi {{name}}, you have {{count:number}} items");
    expect(() => renderRaw(t, { name: "Ana", count: 1, x: 2 })).toThrowError(TemplateError);
    try {
      renderRaw(t, { name: "Ana", count: 1, x: 2 });
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      const te = err as TemplateError;
      expect(te.code).toBe("unknown_variable");
      expect(te.message).toContain("unknown variable: x");
    }
  });

  it("throws invalid_type for wrong value types", () => {
    const t = template("Hi {{name}}, you have {{count:number}} items");
    const wrongCases = [
      { name: "Ana", count: "3" },
      { name: "Ana", count: NaN },
      { name: 42, count: 3 },
    ];
    for (const vars of wrongCases) {
      expect(() => renderRaw(t, vars)).toThrowError(TemplateError);
      try {
        renderRaw(t, vars);
      } catch (err) {
        expect(err).toBeInstanceOf(TemplateError);
        const te = err as TemplateError;
        expect(te.code).toBe("invalid_type");
        // message should mention variable name, not value
        expect(te.message.length).toBeLessThanOrEqual(200);
      }
    }
  });

  it("rejects non-plain objects", () => {
    const t = template("Hi {{name}}");
    for (const bad of [null, undefined, [], 42, "x"]) {
      expect(() => renderRaw(t, bad)).toThrowError(TemplateError);
      try {
        renderRaw(t, bad);
      } catch (err) {
        expect(err).toBeInstanceOf(TemplateError);
        const te = err as TemplateError;
        expect(te.code).toBe("invalid_type");
        expect(te.message).toContain("plain object");
      }
    }
  });

  it("rejects objects whose keys come from the prototype chain", () => {
    const t = template("{{toString}}");
    expect(() => renderRaw(t, {})).toThrowError(TemplateError);
    try {
      renderRaw(t, {});
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      const te = err as TemplateError;
      expect(te.code).toBe("missing_variable");
      expect(te.message).toContain("missing variable: toString");
    }
  });

  it("rejects non-plain object instances", () => {
    const t = template("Hi {{name}}");
    const badObjects = [Object.create({ name: "x" }), new Map([["name", "x"]])];
    for (const bad of badObjects) {
      expect(() => renderRaw(t, bad)).toThrowError(TemplateError);
      try {
        renderRaw(t, bad);
      } catch (err) {
        expect(err).toBeInstanceOf(TemplateError);
        const te = err as TemplateError;
        expect(te.code).toBe("invalid_type");
        expect(te.message).toContain("plain object");
      }
    }
  });

  it("rejects sparse arrays", () => {
    const t = template("{{items:list}}");
    const sparse: unknown[] = [];
    sparse.length = 3;
    sparse[0] = "a";
    sparse[2] = "b";
    for (const bad of [new Array(3), sparse]) {
      expect(() => renderRaw(t, { items: bad })).toThrowError(TemplateError);
      try {
        renderRaw(t, { items: bad });
      } catch (err) {
        expect(err).toBeInstanceOf(TemplateError);
        const te = err as TemplateError;
        expect(te.code).toBe("invalid_type");
        expect(te.message).toContain("items");
      }
    }
  });

  it("handles placeholders at start and end", () => {
    const t = template("{{start}} middle {{end}}");
    expect(t.render({ start: "S", end: "E" })).toBe("S middle E");
    expect(t.variables).toEqual([
      { name: "start", type: "string" },
      { name: "end", type: "string" },
    ]);
  });

  it("allows same variable multiple times with same type", () => {
    const t = template("{{x}} and {{x}}");
    expect(t.render({ x: "v" })).toBe("v and v");
    expect(t.variables).toEqual([{ name: "x", type: "string" }]);
  });

  it("does not mangle literal braces", () => {
    const t = template('JSON: { "a": 1 }');
    expect(t.render({})).toBe('JSON: { "a": 1 }');
    expect(t.variables).toEqual([]);
  });

  it('renders -0 as "0"', () => {
    const t = template("{{n:number}}");
    expect(t.render({ n: -0 })).toBe("0");
  });

  it("renders empty list as empty string", () => {
    const t = template("{{items:list}}");
    expect(t.render({ items: [] })).toBe("");
  });

  it("renders list with empty string item", () => {
    const t = template("{{items:list}}");
    expect(t.render({ items: [""] })).toBe("- ");
  });
});
