import { describe, expect, it } from "vitest";
import { template } from "../src/index.js";

// This file is compiled by `tsc --noEmit` to exercise type inference. Wrapping the calls in a
// function that the test only references keeps vitest from executing renders that would throw.

describe("types", () => {
  it("compiles the type-level assertions below", () => {
    expect(typeof typeChecks).toBe("function");
  });
});

function typeChecks(): void {
  const t = template("Hi {{name}}, you have {{count:number}} items");

  // Correct call
  t.render({ name: "Ana", count: 3 });

  // Missing variable
  // @ts-expect-error
  t.render({ name: "Ana" });

  // Wrong type for count
  // @ts-expect-error
  t.render({ name: "Ana", count: "3" });

  const tList = template("Rules:\n{{rules:list}}");
  tList.render({ rules: ["a"] });

  // @ts-expect-error
  tList.render({ rules: "a" });

  const tEmpty = template("No placeholders");
  tEmpty.render({});

  // @ts-expect-error
  tEmpty.render({ x: 1 });
}
