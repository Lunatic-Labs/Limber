import { test } from "node:test";
import assert from "node:assert/strict";
import { ObjectUrlRegistry } from "../lib/object-urls";

function setup() {
  const created: string[] = [];
  const revoked: string[] = [];
  let n = 0;
  const registry = new ObjectUrlRegistry({
    create: () => {
      const url = `blob:test/${n++}`;
      created.push(url);
      return url;
    },
    revoke: (url) => revoked.push(url),
  });
  return { registry, created, revoked };
}

const blob = new Blob(["x"]);

test("create returns a URL for an open owner", () => {
  const { registry, created } = setup();
  registry.open("a");
  assert.equal(registry.create("a", blob), "blob:test/0");
  assert.deepEqual(created, ["blob:test/0"]);
});

test("create refuses owners that were never opened", () => {
  const { registry, created } = setup();
  assert.equal(registry.create("a", blob), null);
  assert.equal(created.length, 0);
});

test("upload finishing after removal creates no URL", () => {
  const { registry, created } = setup();
  registry.open("a");
  registry.release("a"); // user removed the file mid-upload
  assert.equal(registry.create("a", blob), null);
  assert.equal(created.length, 0);
});

test("release revokes the URL once and is idempotent", () => {
  const { registry, revoked } = setup();
  registry.open("a");
  registry.create("a", blob);
  registry.release("a");
  registry.release("a");
  assert.deepEqual(revoked, ["blob:test/0"]);
  assert.equal(registry.size, 0);
});

test("release on an owner with no URL yet revokes nothing", () => {
  const { registry, revoked } = setup();
  registry.open("a");
  registry.release("a");
  assert.deepEqual(revoked, []);
});

test("releaseUrl revokes by URL value and leaves others alone", () => {
  const { registry, revoked } = setup();
  registry.open("a");
  registry.open("b");
  registry.create("a", blob);
  const urlB = registry.create("b", blob)!;
  registry.releaseUrl(urlB);
  registry.releaseUrl(urlB);
  assert.deepEqual(revoked, [urlB]);
  assert.equal(registry.size, 1);
});

test("releaseUrl ignores unknown URLs (e.g. server URLs)", () => {
  const { registry, revoked } = setup();
  registry.releaseUrl("/api/plans/1/attachments/2");
  assert.deepEqual(revoked, []);
});

test("recreating for the same owner revokes the previous URL", () => {
  const { registry, revoked } = setup();
  registry.open("a");
  registry.create("a", blob);
  registry.create("a", blob);
  assert.deepEqual(revoked, ["blob:test/0"]);
});

test("dispose revokes everything and blocks later creates", () => {
  const { registry, revoked, created } = setup();
  registry.open("a");
  registry.open("b");
  registry.create("a", blob);
  registry.create("b", blob);
  registry.dispose();
  assert.deepEqual(revoked.sort(), ["blob:test/0", "blob:test/1"]);
  registry.open("c");
  assert.equal(registry.create("c", blob), null);
  assert.equal(created.length, 2);
});

test("activate re-enables a disposed registry", () => {
  const { registry } = setup();
  registry.dispose();
  registry.activate();
  registry.open("a");
  assert.ok(registry.create("a", blob));
});
