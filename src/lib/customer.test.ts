import { describe, expect, it } from "vitest";
import { customerKey } from "./customer";

describe("customerKey", () => {
  it("prefere o email quando disponível", () => {
    expect(customerKey({ email: "a@b.com", phone: "123", name: "Ana" })).toBe("a@b.com");
  });

  it("cai para o telefone sem email", () => {
    expect(customerKey({ phone: "923000000", name: "Ana" })).toBe("923000000");
  });

  it("cai para o nome sem email nem telefone", () => {
    expect(customerKey({ name: "Ana" })).toBe("Ana");
  });

  it("devolve string vazia sem nenhum dado", () => {
    expect(customerKey({})).toBe("");
  });
});
