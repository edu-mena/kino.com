import { describe, expect, it } from "vitest";
import { isVideoSrc, parseTimeFragment } from "./video-trim";

describe("isVideoSrc", () => {
  it("deteta data URLs de vídeo", () => {
    expect(isVideoSrc("data:video/webm;base64,AAAA")).toBe(true);
    expect(isVideoSrc("data:video/mp4;base64,AAAA#t=3,20")).toBe(true);
  });
  it("deteta URLs com extensão de vídeo", () => {
    expect(isVideoSrc("https://x.com/a.mp4")).toBe(true);
    expect(isVideoSrc("https://x.com/a.webm?v=2")).toBe(true);
    expect(isVideoSrc("https://x.com/a.MOV#t=1,4")).toBe(true);
  });
  it("não trata imagens/URLs comuns como vídeo", () => {
    expect(isVideoSrc("data:image/jpeg;base64,AAAA")).toBe(false);
    expect(isVideoSrc("https://x.com/a.jpg")).toBe(false);
    expect(isVideoSrc("https://x.com/mp4-thing/photo.png")).toBe(false);
  });
});

describe("parseTimeFragment", () => {
  it("lê #t=a,b", () => {
    expect(parseTimeFragment("blob:x#t=3.00,20.00")).toEqual({ start: 3, end: 20 });
    expect(parseTimeFragment("data:video/mp4;base64,AA#t=1.5,4.25")).toEqual({
      start: 1.5,
      end: 4.25,
    });
  });
  it("devolve null quando não há fragmento válido", () => {
    expect(parseTimeFragment("data:video/webm;base64,AAAA")).toBeNull();
    expect(parseTimeFragment("x#t=5,5")).toBeNull();
    expect(parseTimeFragment("x#t=9,2")).toBeNull();
  });
});
