# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [9.0.0-alpha.1](https://github.com/digidem/mapeo-core/compare/v9.0.0-alpha.0...v9.0.0-alpha.1) (2023-10-03)

### Features

- $blobs.getUrl and $blobs.create methods ([#184](https://github.com/digidem/mapeo-core/issues/184)) ([fb33178](https://github.com/digidem/mapeo-core/commit/fb33178e61a0b96add31809a227e59f954ba3d1d))
- add capabilities ([#231](https://github.com/digidem/mapeo-core/issues/231)) ([107bf8f](https://github.com/digidem/mapeo-core/commit/107bf8f563bd817c5acbe416b3315298354bc158))
- Add config store and preset & field types ([#174](https://github.com/digidem/mapeo-core/issues/174)) ([9f16817](https://github.com/digidem/mapeo-core/commit/9f16817b5d861cfde460337cd8155c12a46321af))
- Add encode/decode for project keys [3/3] ([#203](https://github.com/digidem/mapeo-core/issues/203)) ([4b9900a](https://github.com/digidem/mapeo-core/commit/4b9900a43a1ba160d9b877f88de59eb2e2cd5e7c))
- add getById method to member api ([#262](https://github.com/digidem/mapeo-core/issues/262)) ([d035a83](https://github.com/digidem/mapeo-core/commit/d035a834c6179f8113ca8778d27467ce0bb48202))
- add getMany method to member api ([#263](https://github.com/digidem/mapeo-core/issues/263)) ([350ccc5](https://github.com/digidem/mapeo-core/commit/350ccc59f1d394eb8f7d0e56530455044ea02700))
- Add internal `dataType.createWithDocId()` ([#192](https://github.com/digidem/mapeo-core/issues/192)) ([ba34e11](https://github.com/digidem/mapeo-core/commit/ba34e11148999693477fffa350336f65de6953b1)), closes [#190](https://github.com/digidem/mapeo-core/issues/190)
- add invite namespace to MapeoManager ([#281](https://github.com/digidem/mapeo-core/issues/281)) ([021ef15](https://github.com/digidem/mapeo-core/commit/021ef153678527063911006b6b6840187001c787))
- add ipc wrappers ([#261](https://github.com/digidem/mapeo-core/issues/261)) ([aae39e8](https://github.com/digidem/mapeo-core/commit/aae39e8815b8fe813d8667a87be7a78cf27a1800))
- Add RPC sendDeviceInfo() + device-info event ([#270](https://github.com/digidem/mapeo-core/issues/270)) ([88723c4](https://github.com/digidem/mapeo-core/commit/88723c4d9dc6768f6f4f089b996f280490225398))
- add schema definition for project keys table ([#169](https://github.com/digidem/mapeo-core/issues/169)) ([9aaa193](https://github.com/digidem/mapeo-core/commit/9aaa19394b1f47ce5f22dc4d4669a464b61ae3ae))
- Add set & get deviceInfo & datatype ([#250](https://github.com/digidem/mapeo-core/issues/250)) ([f4d1a24](https://github.com/digidem/mapeo-core/commit/f4d1a24571f2742de0a868fe43fe5fac0c184e51))
- addCreatedBy ([#274](https://github.com/digidem/mapeo-core/issues/274)) ([ee0defa](https://github.com/digidem/mapeo-core/commit/ee0defa7be33d40700d00b0bc583f9b067c8ffd0))
- CoreOwnership class w getOwner & getCoreKey [2/3] ([#229](https://github.com/digidem/mapeo-core/issues/229)) ([7faa1d5](https://github.com/digidem/mapeo-core/commit/7faa1d57530fdb2bf387203dcd35e3049827befc))
- coreOwnership integration [3/3] ([#230](https://github.com/digidem/mapeo-core/issues/230)) ([51d9f80](https://github.com/digidem/mapeo-core/commit/51d9f80b1a5b5674238e2fefd35a3876d32b673d))
- disable namespace replication ([#285](https://github.com/digidem/mapeo-core/issues/285)) ([c9387bd](https://github.com/digidem/mapeo-core/commit/c9387bd8ec8655f72431ff4ecee56d9ff9167465))
- expose blobStore.writerDriveId ([#219](https://github.com/digidem/mapeo-core/issues/219)) ([64cd120](https://github.com/digidem/mapeo-core/commit/64cd120badc4c88792a8e929ab897c76f5da47f3))
- expose capabilities in MapeoProject and its member api ([#286](https://github.com/digidem/mapeo-core/issues/286)) ([1e98363](https://github.com/digidem/mapeo-core/commit/1e98363bf6f0fea027a238841791d6d776addce0))
- handle `coreOwnership` records in `IndexWriter` [1/3] ([#214](https://github.com/digidem/mapeo-core/issues/214)) ([dbc52c3](https://github.com/digidem/mapeo-core/commit/dbc52c35aedc9fcaeb59e8fbc93d05244b46a562))
- Implement MdnsDiscovery ([#177](https://github.com/digidem/mapeo-core/issues/177)) ([ca3b6c7](https://github.com/digidem/mapeo-core/commit/ca3b6c73d5bbd6650124d27f14410b1a188f54ef))
- send core "haves" bitfield on first connect ([#254](https://github.com/digidem/mapeo-core/issues/254)) ([4042a8f](https://github.com/digidem/mapeo-core/commit/4042a8fde1e6428c2605d5707b1c5f3499aed9ad))
- share all core keys via extension messages ([#264](https://github.com/digidem/mapeo-core/issues/264)) ([7142b86](https://github.com/digidem/mapeo-core/commit/7142b862c7863aa79a2fa403624fc9d64b92025a)), closes [#254](https://github.com/digidem/mapeo-core/issues/254) [#251](https://github.com/digidem/mapeo-core/issues/251)
- update main exports ([#284](https://github.com/digidem/mapeo-core/issues/284)) ([1e0df1c](https://github.com/digidem/mapeo-core/commit/1e0df1c2380f9231a6f8a6fc9bf74204322ccbb8))
- update protobuf for RPC [2/3] ([#202](https://github.com/digidem/mapeo-core/issues/202)) ([986f1dd](https://github.com/digidem/mapeo-core/commit/986f1dd2f3747a753d08e2bc67a0077293bfba44))

### Bug Fixes

- adjust storage options for MapeoManager and MapeoProject ([#235](https://github.com/digidem/mapeo-core/issues/235)) ([1bd2613](https://github.com/digidem/mapeo-core/commit/1bd261320cc6763e58bbc59931999c9fac6fb1fc))
- fix usage of drizzle when core is used as a dep ([#283](https://github.com/digidem/mapeo-core/issues/283)) ([2dfa016](https://github.com/digidem/mapeo-core/commit/2dfa016654bfa578363622a3f89465164ba3d21c))
- invite.encryptionKeys should be required ([#260](https://github.com/digidem/mapeo-core/issues/260)) ([8be90d2](https://github.com/digidem/mapeo-core/commit/8be90d2cde7756594fe9a3fc57d607e991c3b632))
- properly generate column names in projectKeys table ([#173](https://github.com/digidem/mapeo-core/issues/173)) ([1f62404](https://github.com/digidem/mapeo-core/commit/1f62404fa0b39d73c5e60488d7efcfddced57312))

## 9.0.0-alpha.0 (2023-08-14)

### Features

- Add createDataStream() for exporting data, with optional filter ([#111](https://github.com/digidem/mapeo-core/issues/111)) ([bdfae30](https://github.com/digidem/mapeo-core/commit/bdfae303db5df076a2a5cdcd8810b646d61eb951))
- add deforking opts to observationList ([a382b1b](https://github.com/digidem/mapeo-core/commit/a382b1b92cbd7d76c6ccb5e1c5ec85451f60a1fe))
- add error metadata ([#63](https://github.com/digidem/mapeo-core/issues/63)) ([025a8b0](https://github.com/digidem/mapeo-core/commit/025a8b09fe29e12ade4162296012308e51b977ad))
- add projectConfig & encryptionKeys to invite ([#88](https://github.com/digidem/mapeo-core/issues/88)) ([53747d4](https://github.com/digidem/mapeo-core/commit/53747d4a564077bf3f459e72dd920b87ba62736c))
- Add websocket sync ([#108](https://github.com/digidem/mapeo-core/issues/108)) ([59b6f42](https://github.com/digidem/mapeo-core/commit/59b6f424ec3d81b5fbe7d4ea5769e7202e02d200)), closes [#111](https://github.com/digidem/mapeo-core/issues/111) [#107](https://github.com/digidem/mapeo-core/issues/107) [#106](https://github.com/digidem/mapeo-core/issues/106) [#109](https://github.com/digidem/mapeo-core/issues/109) [#112](https://github.com/digidem/mapeo-core/issues/112) [#107](https://github.com/digidem/mapeo-core/issues/107)
- allow "undefined" for device{Name,Type} ([120c31a](https://github.com/digidem/mapeo-core/commit/120c31a5302d2288b21fef391e5b307356bca838))
- blobstore ([#62](https://github.com/digidem/mapeo-core/issues/62)) ([856f8fe](https://github.com/digidem/mapeo-core/commit/856f8feb1f590f368b1ed79b007370d6f92933c8))
- BREAKING: de-fork observationList by default ([#44](https://github.com/digidem/mapeo-core/issues/44)) ([5a151ba](https://github.com/digidem/mapeo-core/commit/5a151bad6b8187a31f1b4661a5d1f154426b1d6f))
- **BREAKING:** expose progress event + object ([d08143f](https://github.com/digidem/mapeo-core/commit/d08143ffdab8ae6046ad0b6477fe9dddaef21e06))
- **BREAKING:** use new flat kappa-osm doc format ([70662ec](https://github.com/digidem/mapeo-core/commit/70662ece748f6bfcc1e40fae7a66db5a27bc6f58))
- bring in export and import code from mapeo-desktop, add tests with presets ([8152b7b](https://github.com/digidem/mapeo-core/commit/8152b7bff3b8fc27d37b931b57cbfab116b48f43))
- core-manager ([#72](https://github.com/digidem/mapeo-core/issues/72)) ([e060331](https://github.com/digidem/mapeo-core/commit/e0603313b7a9449d7b4cab20dc55d423db19b5a0))
- data hypercores, schemas, validation, indexing ([#16](https://github.com/digidem/mapeo-core/issues/16)) ([8584770](https://github.com/digidem/mapeo-core/commit/85847702f6c8a9700bc993221aa56557e085c324))
- **export:** Optional include metadata in export ([#120](https://github.com/digidem/mapeo-core/issues/120)) ([bbbe7a0](https://github.com/digidem/mapeo-core/commit/bbbe7a0d8fadccd05efa85901a417d4c34d02805))
- expose "connected" peer property ([61b6418](https://github.com/digidem/mapeo-core/commit/61b64189d4fab6e987f321949c60fcc4d07f3584))
- expose api for setting sync target name ([9bcb6f7](https://github.com/digidem/mapeo-core/commit/9bcb6f74d69fa7cb482c646a6c5cf67350961cc8))
- expose deviceType on peers API ([881e812](https://github.com/digidem/mapeo-core/commit/881e812e2f3bf8261b83a8f931842eb4e2b90f4f))
- Expose onConnection for direct peers ([#103](https://github.com/digidem/mapeo-core/issues/103)) ([3eb9217](https://github.com/digidem/mapeo-core/commit/3eb921751aaf52401411736ff65ce3d69b09f293))
- invites ([#70](https://github.com/digidem/mapeo-core/issues/70)) ([b95bfbf](https://github.com/digidem/mapeo-core/commit/b95bfbfcac7bc9ad68181cfa4b86047c46c8fb4a))
- MapeoProject class with updated DataStore, DataType & IndexWriter ([#149](https://github.com/digidem/mapeo-core/issues/149)) ([1ffd49f](https://github.com/digidem/mapeo-core/commit/1ffd49f1dbac6ed8c40e5d084712dd40b11de155))
- mdns & dht discovery ([#11](https://github.com/digidem/mapeo-core/issues/11)) ([670c6e1](https://github.com/digidem/mapeo-core/commit/670c6e1026fe89ee78d0b533a5cada64cc9bebff))
- selective media sync based on device-type ([34505e9](https://github.com/digidem/mapeo-core/commit/34505e9253ed0120eaad456bc83dbc3785f8e1a7))
- serve blobs over http ([#117](https://github.com/digidem/mapeo-core/issues/117)) ([8e64abd](https://github.com/digidem/mapeo-core/commit/8e64abdf736b31d1a13a1d9791fd9f677118d8d2))
- support block encryption ([#87](https://github.com/digidem/mapeo-core/issues/87)) ([346e593](https://github.com/digidem/mapeo-core/commit/346e5935e86945105740aa6020b34e1e1a4cafa6))
- support internet discovery of peers ([c4b6e43](https://github.com/digidem/mapeo-core/commit/c4b6e43f414a9164dae19d7ab7c8155480f7b963))
- Use project IDs to prevent sneakernet sync between different projects ([6db8df7](https://github.com/digidem/mapeo-core/commit/6db8df73260fb84d4f5236ecffd34c37d3e58acc))
- use shp-write to write zip file for shapes ([756c39a](https://github.com/digidem/mapeo-core/commit/756c39a7d759e84b82fe774c99e40dfdaba7c9a4))

### Bug Fixes

- add "links" to the toplevel property list ([6da8aa6](https://github.com/digidem/mapeo-core/commit/6da8aa6994b7dd71f36dcec45b5e17c0c2780270))
- add check for connected property before syncronizing ([100b532](https://github.com/digidem/mapeo-core/commit/100b5324fb9302329e99bae4a80097a74d45d8d0))
- add event listener after sync handshake is accepted ([daa836c](https://github.com/digidem/mapeo-core/commit/daa836c825ef3119253774cfaf0dc08f731941b6))
- add failing test ([391fdc5](https://github.com/digidem/mapeo-core/commit/391fdc5d6289f365c68daa7e02a4ea8d7d611ae0))
- Add file descriptor pool to storage ([#123](https://github.com/digidem/mapeo-core/issues/123)) ([d40fcce](https://github.com/digidem/mapeo-core/commit/d40fcce68559a3bc816fdc3b6ecd39f634fb0b23))
- add osm data progress tracking to network sync ([93a1d32](https://github.com/digidem/mapeo-core/commit/93a1d32ab0c273d0d32b15083be164a2f093d2f7))
- after feedback from nettle ([aa34f21](https://github.com/digidem/mapeo-core/commit/aa34f216fee112ffe94e6737d599789745e63043))
- always emit 'down' when peer has completed and is disconnected ([f30cbae](https://github.com/digidem/mapeo-core/commit/f30cbaec3974a0111d0bf6b45ec5d00e8d3ed898))
- check syncfile type on sync-to-file ([cbaa439](https://github.com/digidem/mapeo-core/commit/cbaa439f8a7f7353ca4156b32536c4db7230eb45))
- clear obs.links so it doesnt create a fork ([4f43dd7](https://github.com/digidem/mapeo-core/commit/4f43dd7c58b2bdc268fabdae059b25610b3b4458))
- close indexes in tests ([9eed341](https://github.com/digidem/mapeo-core/commit/9eed3419b2994e139d154cc7250b27d8a0509bab))
- close order ([23118c6](https://github.com/digidem/mapeo-core/commit/23118c6a6373b2d1e688b10e892ea02d71a25975))
- Close syncfile properly after an invalid sync attempt ([#132](https://github.com/digidem/mapeo-core/issues/132)) ([e428e8c](https://github.com/digidem/mapeo-core/commit/e428e8c7ba210d67a67178534c31647a5ae5a1ad))
- **defork:** Fix defork when timestamps of forks are equal ([2323278](https://github.com/digidem/mapeo-core/commit/2323278d6c146bf6fa2561fde8863597b7c3609b))
- delete all sizes of observation media attachments ([cbed749](https://github.com/digidem/mapeo-core/commit/cbed74971b01b16a0ad0da66d8ee353c4cd7affc))
- disconnecting/reconnecting logic ([c6f91c1](https://github.com/digidem/mapeo-core/commit/c6f91c1bc3697ee5c6bced19e60ae011f50e1a9a))
- dont add media stream until after handshake is accepted ([8212fa3](https://github.com/digidem/mapeo-core/commit/8212fa37f400a60dd93e93c88cb705c8de9909e0))
- dont auto-sync multifeed! ([b3ae0a8](https://github.com/digidem/mapeo-core/commit/b3ae0a8890d8a1de46c422d93854ca68d82ee90b))
- dont create peer until handshake recv ([fa4ad2a](https://github.com/digidem/mapeo-core/commit/fa4ad2a3113768722f1173e44efc0a00872c8232))
- dont fail syncfile cmp if "p2p-db" key not present ([8ce4879](https://github.com/digidem/mapeo-core/commit/8ce4879e13a884a72badb6ae47d45115c956df58))
- dont lose default opts ([1af061f](https://github.com/digidem/mapeo-core/commit/1af061f037a9f847124a9cac4a269760d4d04e08))
- ensure Buffer is used for discovery-swarm ([7182062](https://github.com/digidem/mapeo-core/commit/7182062db9e7c1b8fb488c1c36daf6f8f2860414))
- ensure PAUSE calls match RESUME calls ([6232f58](https://github.com/digidem/mapeo-core/commit/6232f5802adca0396a6fa06e2a9da3588a5222e9))
- ensure string peer.id is used ([cc0d320](https://github.com/digidem/mapeo-core/commit/cc0d3201b63652ec5514d8add75a053536b179c9))
- expose peer.id as a string, not buffer ([4bb2784](https://github.com/digidem/mapeo-core/commit/4bb2784b3034d5e4f0c5f88e3711437430d8b12c))
- Fix breaking test ([f4cf237](https://github.com/digidem/mapeo-core/commit/f4cf237ba0bac086ce7ab15fa81629606dd30d5e))
- Fix file sync error: pass projectKey to Syncfile as encryption key ([192b4e8](https://github.com/digidem/mapeo-core/commit/192b4e8c041a34b81e8981da6f5c99c4a12299d3))
- Fix logic for determining if an external file can be synced with ([#124](https://github.com/digidem/mapeo-core/issues/124)) ([1ec28ce](https://github.com/digidem/mapeo-core/commit/1ec28ce78f5417587b153608be4d53d947d86000))
- Fix types and typescript config for publishing ([#162](https://github.com/digidem/mapeo-core/issues/162)) ([31727ba](https://github.com/digidem/mapeo-core/commit/31727bac2ab035e5960c6d8e4101db3b5b289d17))
- for some reason, progress events for media weren't always accurate. ([#97](https://github.com/digidem/mapeo-core/issues/97)) ([98fdce4](https://github.com/digidem/mapeo-core/commit/98fdce43147c3420d1264b2707e609b41bbabe91))
- generate node stream from shapefile handled in shp-write ([d592479](https://github.com/digidem/mapeo-core/commit/d592479cc23b60d943509e8e7231d83c2e1eb33e))
- hyperdrive update & fix BlobStore tests ([#126](https://github.com/digidem/mapeo-core/issues/126)) ([16bef6c](https://github.com/digidem/mapeo-core/commit/16bef6c517d22271eb615f684200899e3661b523))
- increase time to wait for race condition ([4812e81](https://github.com/digidem/mapeo-core/commit/4812e81588c03b431400ae3b0f282b52230ed588))
- less fragile listen/close logic ([9fe6b97](https://github.com/digidem/mapeo-core/commit/9fe6b97067d78947b05955cbb7fa2cbf2b14b832))
- look up sync target when only host/port is given ([c1c792c](https://github.com/digidem/mapeo-core/commit/c1c792c1572d16ea3fdd439ec3fd553ce9a4bff8))
- make a copy of obs instead of modifying ([d0062f3](https://github.com/digidem/mapeo-core/commit/d0062f36373193d97f4ef038d361af6cd164d765))
- make sure the sync stream propagates error up the stack ([bac1042](https://github.com/digidem/mapeo-core/commit/bac104254c60e8513a4a5c54e0f96d49587772c7))
- make sync timeout heartbeat longer ([e7203db](https://github.com/digidem/mapeo-core/commit/e7203db47ca4be09f3f63a174d79fc3dd0506ee8))
- Multiple syncronizations in a row with missing data should not fail ([#100](https://github.com/digidem/mapeo-core/issues/100)) ([077d580](https://github.com/digidem/mapeo-core/commit/077d580d41e7dae10d1c02935c8d16e2aa811438))
- observation conversion issues ([75707e1](https://github.com/digidem/mapeo-core/commit/75707e125e204d2e1b5abfef4f97042385becce8))
- observation deletion support for multiple heads (forks) ([42dfa2d](https://github.com/digidem/mapeo-core/commit/42dfa2d437049d770797ba5c13a855103608df25))
- observationDelete should maintain links and observationStream will filter out deleted ([143d0da](https://github.com/digidem/mapeo-core/commit/143d0daa3580deb07ccb34884603ccfde7bec9a2))
- pass mapeo-core instance ([d425567](https://github.com/digidem/mapeo-core/commit/d425567f720cd16674cc501d440d60c32e9f594d))
- pass opts into swarm init ([5545dc2](https://github.com/digidem/mapeo-core/commit/5545dc208792764f919af9ff46f4be07642f0cea))
- persist cores ([#85](https://github.com/digidem/mapeo-core/issues/85)) ([ee8beea](https://github.com/digidem/mapeo-core/commit/ee8beea11e97c5bd86777b20a7c9aaed4bdffdb7))
- pin discovery-swarm to 6.0.0 ([eaca49a](https://github.com/digidem/mapeo-core/commit/eaca49a001be4e615a8d2a2cb5be91d537bf7ecb))
- projectId -> projectKey for syncfile opts ([6ab4406](https://github.com/digidem/mapeo-core/commit/6ab4406e2b4812cd48e9ed746cbf6384da134ae8))
- properly close osm & emit close event ([a202491](https://github.com/digidem/mapeo-core/commit/a202491141221c6c51546be031454b3cca31397e))
- remove hypercore-protocol timeout on replication stream ([94c518c](https://github.com/digidem/mapeo-core/commit/94c518cd4da5afacf0cfca2d722fdf277bf274b6))
- report the difference between a remote close vs clean sync ([8377a99](https://github.com/digidem/mapeo-core/commit/8377a99a85b9eff6ae53274d87fe1885a62aa3bb))
- ridiculous wait times ([c8d9562](https://github.com/digidem/mapeo-core/commit/c8d9562971b3f6353afa45449d6cf19159f882a8))
- s/this/self ([2f71624](https://github.com/digidem/mapeo-core/commit/2f7162479d4fc70ce2eda4628cb187bc2ca818c1))
- some sync timing fixes ([6bde6e3](https://github.com/digidem/mapeo-core/commit/6bde6e312c6fa1ccc49219fa4bb00654575bc640))
- swarm key ([98fffb8](https://github.com/digidem/mapeo-core/commit/98fffb8a3a7ec5ac951a7375dd4a11ddb23a654e))
- Sync peers should always emit the close event and have 'started' ([6740e8b](https://github.com/digidem/mapeo-core/commit/6740e8b7a9c04425200ca1a63060fdb04e21c184))
- sync queue ([7a253fc](https://github.com/digidem/mapeo-core/commit/7a253fc2456442f2ec70112fe67f3d5e8fcb21e9))
- **tests:** Adjust fork test to be closer to real-world situation ([df677cf](https://github.com/digidem/mapeo-core/commit/df677cfff22d146311aa3aad0bea8daa00831278))
- **tests:** Change obs fixture tags to object ([40e51e8](https://github.com/digidem/mapeo-core/commit/40e51e8e4e9c40509cd3e5fed41144c67fea1a52))
- **tests:** Don't mutate global observation fixture in tests ([a27dc38](https://github.com/digidem/mapeo-core/commit/a27dc38952c49dd6b7b56be7edc8159fc7d3210d))
- throw error on missing data ([c95470f](https://github.com/digidem/mapeo-core/commit/c95470f4d4addf5f69cba1f635132e39f3af815d))
- travis on node 12 (what we're using in production) ([5e1fc16](https://github.com/digidem/mapeo-core/commit/5e1fc166e3f7c8cef7d3dc3e6bf29a1f51776000))
- use discovery key in syncfile ([#62](https://github.com/digidem/mapeo-core/issues/62)) ([4a9a25b](https://github.com/digidem/mapeo-core/commit/4a9a25b87fbb7616cfba64a66ac0d80c9cb7cc48))
- use fs osm-p2p module ([f6c48b7](https://github.com/digidem/mapeo-core/commit/f6c48b701f61d0e151f95de43d20ebde5f68e5cb))
- use Object.values polyfill for node<6 ([68f37b9](https://github.com/digidem/mapeo-core/commit/68f37b9bd919af7604aa702cd5969ddcd574623f))
- use opts in swarm ([20f9dcb](https://github.com/digidem/mapeo-core/commit/20f9dcb43775d5f77cfe720081b4a2c0462be0f8))
- use properly hashed key for net discovery ([097deee](https://github.com/digidem/mapeo-core/commit/097deeeab6d62cedf33049ab2f3678e3141b2269))
- use stable swarm id (hypercore pubkey) ([aaa4b33](https://github.com/digidem/mapeo-core/commit/aaa4b3382c998ba8b88721f3e153b9e769abeaeb))
- Wait for pause to complete before starting sync ([aed1890](https://github.com/digidem/mapeo-core/commit/aed18901210fa51b162c7ea5269e0b4a0d75930f))
- when no opts passed to observationStream, was failing ([ba71f15](https://github.com/digidem/mapeo-core/commit/ba71f1563280534cb42e22413d6c0e3ee9237eed))

### [8.6.2](https://github.com/digidem/mapeo-core/compare/v8.6.1...v8.6.2) (2021-11-16)

### Bug Fixes

- Close syncfile properly after an invalid sync attempt ([#132](https://github.com/digidem/mapeo-core/issues/132)) ([e428e8c](https://github.com/digidem/mapeo-core/commit/e428e8c7ba210d67a67178534c31647a5ae5a1ad))

### [8.6.1](https://github.com/digidem/mapeo-core/compare/v8.6.0...v8.6.1) (2021-10-12)

### Bug Fixes

- Fix logic for determining if an external file can be synced with ([#124](https://github.com/digidem/mapeo-core/issues/124)) ([1ec28ce](https://github.com/digidem/mapeo-core/commit/1ec28ce78f5417587b153608be4d53d947d86000))

## [8.6.0](https://github.com/digidem/mapeo-core/compare/v8.5.0...v8.6.0) (2021-06-23)

### Features

- **export:** Optional include metadata in export ([#120](https://github.com/digidem/mapeo-core/issues/120)) ([bbbe7a0](https://github.com/digidem/mapeo-core/commit/bbbe7a0d8fadccd05efa85901a417d4c34d02805))

## [8.5.0](https://github.com/digidem/mapeo-core/compare/v8.4.0...v8.5.0) (2021-02-04)

### Features

- Add websocket sync ([#108](https://github.com/digidem/mapeo-core/issues/108)) ([59b6f42](https://github.com/digidem/mapeo-core/commit/59b6f424ec3d81b5fbe7d4ea5769e7202e02d200)), closes [#111](https://github.com/digidem/mapeo-core/issues/111) [#107](https://github.com/digidem/mapeo-core/issues/107) [#106](https://github.com/digidem/mapeo-core/issues/106) [#109](https://github.com/digidem/mapeo-core/issues/109) [#112](https://github.com/digidem/mapeo-core/issues/112) [#107](https://github.com/digidem/mapeo-core/issues/107)

## [8.4.0](https://github.com/digidem/mapeo-core/compare/v8.3.2...v8.4.0) (2020-12-17)

### Features

- Add createDataStream() for exporting data, with optional filter ([#111](https://github.com/digidem/mapeo-core/issues/111)) ([bdfae30](https://github.com/digidem/mapeo-core/commit/bdfae303db5df076a2a5cdcd8810b646d61eb951))
- Expose onConnection for direct peers ([#103](https://github.com/digidem/mapeo-core/issues/103)) ([3eb9217](https://github.com/digidem/mapeo-core/commit/3eb921751aaf52401411736ff65ce3d69b09f293))

### [8.2.0](https://github.com/digidem/mapeo-core/compare/v8.1.3...v8.2.0) (2020-05-18)

### Bug Fixes

- Peers no longer automatically sync multifeeds on connect
- `peer.id` is now exposed as a string (not a Buffer)
- More thorough closing on `close` API (also now emits `"close"` event)

### Features

- Exposed `peer.connected` property

### Deprecated

- Deprecated `peer.swarmId`
- Deprecated `peer.connection`

### [8.1.1](https://github.com/digidem/mapeo-core/compare/v8.1.0...v8.1.1) (2019-11-25)

### Bug Fixes

- Fix file sync error: pass projectKey to Syncfile as encryption key ([192b4e8](https://github.com/digidem/mapeo-core/commit/192b4e8c041a34b81e8981da6f5c99c4a12299d3))

## [8.1.0](https://github.com/digidem/mapeo-core/compare/v8.0.4...v8.1.0) (2019-11-17)

### Features

- add error metadata ([#63](https://github.com/digidem/mapeo-core/issues/63)) ([025a8b0](https://github.com/digidem/mapeo-core/commit/025a8b09fe29e12ade4162296012308e51b977ad))

### [8.0.4](https://github.com/digidem/mapeo-core/compare/v8.0.3...v8.0.4) (2019-11-14)

### ⚠ BREAKING CHANGES

- Upgrade stack to use multifeed@4 (breaking change to sync protocol).

  Clients using mapeo-core@7 will not be able to sync with clients using mapeo-core@8, and unfortunately due to a bug clients at mapeo-core@7 will not throw an error, but the @8 side will.

### Features

- Add option to sync based on a `projectKey`.

  Only clients with the same `projectKey` will be able to discover each other
  and sync. Only sync files with the same `projectKey` as the client will sync.
  If no project key is specified the default is `mapeo` and will continue to
  work with older clients.

### Bug Fixes

- projectId -> projectKey for syncfile opts ([6ab4406](https://github.com/digidem/mapeo-core/commit/6ab4406e2b4812cd48e9ed746cbf6384da134ae8))
- use discovery key in syncfile ([#62](https://github.com/digidem/mapeo-core/issues/62)) ([4a9a25b](https://github.com/digidem/mapeo-core/commit/4a9a25b87fbb7616cfba64a66ac0d80c9cb7cc48))

## [7.1.0](https://github.com/digidem/mapeo-core/compare/v7.0.3...v7.1.0) (2019-09-12)

### Bug Fixes

- Fix breaking test ([f4cf237](https://github.com/digidem/mapeo-core/commit/f4cf237))

### Features

- Use project IDs to prevent sneakernet sync between different projects ([6db8df7](https://github.com/digidem/mapeo-core/commit/6db8df7))
