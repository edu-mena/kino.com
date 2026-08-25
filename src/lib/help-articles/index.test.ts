import { describe, expect, it } from "vitest";
import { helpArticlesEn } from "./en";
import { helpArticlesFr } from "./fr";
import { helpArticlesPt } from "./pt";

describe("help articles", () => {
  const ptIds = helpArticlesPt.map((a) => a.id).sort();

  it.each([
    ["en", helpArticlesEn],
    ["fr", helpArticlesFr],
  ])("%s has exactly the same article ids as pt (the source of truth)", (_locale, articles) => {
    const ids = articles.map((a) => a.id).sort();
    expect(ids).toEqual(ptIds);
  });

  it("pt has no duplicate ids", () => {
    expect(new Set(ptIds).size).toBe(ptIds.length);
  });

  it.each([
    ["pt", helpArticlesPt],
    ["en", helpArticlesEn],
    ["fr", helpArticlesFr],
  ])("%s has no empty question/answer", (_locale, articles) => {
    const empty = articles.filter((a) => !a.question.trim() || !a.answer.trim());
    expect(empty).toEqual([]);
  });
});
