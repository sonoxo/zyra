import test from "node:test";
import assert from "node:assert/strict";
import { checkWarRoomCapability, summarizeConnectorStates, type WarRoomConnector } from "./war-room-core";

test("blocks targeting and weapon-control requests", () => {
  assert.equal(checkWarRoomCapability("target selection for a strike").allowed, false);
  assert.equal(checkWarRoomCapability("weapon release workflow").allowed, false);
  assert.equal(checkWarRoomCapability("direct drone control").allowed, false);
  assert.equal(checkWarRoomCapability("offensive cyber intrusion execution").allowed, false);
});

test("allows defensive readiness and public-awareness use cases", () => {
  assert.equal(checkWarRoomCapability("drone maintenance readiness telemetry").allowed, true);
  assert.equal(checkWarRoomCapability("public orbital awareness dashboard").allowed, true);
  assert.equal(checkWarRoomCapability("critical infrastructure continuity planning").allowed, true);
  assert.equal(checkWarRoomCapability("weapon system maintenance readiness status").allowed, true);
});

test("summarizes connector states without converting unavailable into healthy", () => {
  const connectors: WarRoomConnector[] = [
    { id: "a", label: "A", category: "LOCAL", state: "CONNECTED", source: "local", observedAt: new Date(0).toISOString() },
    { id: "b", label: "B", category: "PUBLIC_WEATHER", state: "UNAVAILABLE", source: "public", observedAt: new Date(0).toISOString() },
    { id: "c", label: "C", category: "PUBLIC_ORBITAL", state: "UNKNOWN", source: "public", observedAt: new Date(0).toISOString() },
  ];

  assert.deepEqual(summarizeConnectorStates(connectors), {
    total: 3,
    connected: 1,
    degraded: 0,
    unavailable: 1,
    unknown: 1,
  });
});
