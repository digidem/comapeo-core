import test from "brittle";

import getPort from "get-port";
import createTestnet from "@hyperswarm/testnet";

import { createCoreKeyPair, createIdentityKeys } from "./helpers/index.js";
import { Discovery } from "../lib/discovery.js";

test("discovery - dht/hyperswarm", async (t) => {
  t.plan(2);

  const testnet = await createTestnet(10);
  const bootstrap = testnet.bootstrap;

  const keyPair = createCoreKeyPair("dht-peer-discovery");

  const identity1 = createIdentityKeys();
  const identityPublicKey1 =
    identity1.identityKeyPair.publicKey.toString("hex");

  const identity2 = createIdentityKeys();
  const identityPublicKey2 =
    identity2.identityKeyPair.publicKey.toString("hex");

  const discover1 = new Discovery({
    port: await getPort(),
    keyPair: identity1.identityKeyPair,
    mdns: false,
    dht: { bootstrap, server: true, client: true },
  });

  const discover2 = new Discovery({
    port: await getPort(),
    keyPair: identity2.identityKeyPair,
    mdns: false,
    dht: { bootstrap, server: true, client: true },
  });

  discover1.on("peer", async (connection, peer) => {
    console.log("discover1");
    t.ok(
      peer.identityPublicKey === identityPublicKey2,
      "match key of 2nd peer"
    );
    await step();
  });

  discover2.on("peer", async (connection, peer) => {
    // console.log('discover2')
    t.ok(
      peer.identityPublicKey === identityPublicKey1,
      "match key of 1st peer"
    );
    await step();
  });

  let count = 0;
  async function step() {
    count++;
    if (count === 2) {
      await discover1.leave(keyPair.publicKey);
      await discover2.leave(keyPair.publicKey);
      await discover1.destroy();
      await discover2.destroy();
      await testnet.destroy();
    }
  }

  // TODO: use discoveryKey
  await discover1.join(keyPair.publicKey);
  await discover2.join(keyPair.publicKey);
});
