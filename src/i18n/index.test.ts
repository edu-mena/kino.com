import { describe, expect, it } from "vitest";
import { en } from "./en";
import { fr } from "./fr";
import { interpolate, lookup } from "./index";
import { pt } from "./pt";

/** Flattens a nested dictionary into dot-path keys, e.g. {a: {b: 1}} -> ["a.b"]. */
function keyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    keyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("i18n dictionaries", () => {
  const ptKeys = keyPaths(pt).sort();

  it.each([
    ["en", en],
    ["fr", fr],
  ])("%s has exactly the same keys as pt (the source of truth)", (_locale, dict) => {
    const keys = keyPaths(dict).sort();
    expect(keys).toEqual(ptKeys);
  });

  it.each([
    ["pt", pt],
    ["en", en],
    ["fr", fr],
  ])("%s has no empty string values", (_locale, dict) => {
    const emptyKeys = keyPaths(dict).filter((path) => {
      const value = path
        .split(".")
        .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], dict);
      return typeof value === "string" && value.trim() === "";
    });
    expect(emptyKeys).toEqual([]);
  });
});

describe("lookup", () => {
  it("resolves a nested dot-path key", () => {
    expect(lookup(pt, "common.cancel")).toBe(pt.common.cancel);
  });

  it("returns undefined for a key that doesn't exist", () => {
    expect(lookup(pt, "does.not.exist")).toBeUndefined();
  });

  it("returns undefined when the path resolves through a non-object", () => {
    expect(lookup(pt, "common.cancel.nope")).toBeUndefined();
  });
});

describe("interpolate", () => {
  it("substitutes a {var} placeholder", () => {
    expect(interpolate("Olá, {name}!", { name: "Ana" })).toBe("Olá, Ana!");
  });

  it("substitutes multiple placeholders", () => {
    expect(interpolate("{a} + {b}", { a: 1, b: 2 })).toBe("1 + 2");
  });

  it("leaves an unmatched placeholder untouched", () => {
    expect(interpolate("Olá, {name}!", {})).toBe("Olá, {name}!");
  });

  it("returns the text unchanged when there are no vars", () => {
    expect(interpolate("plain text")).toBe("plain text");
  });
});
