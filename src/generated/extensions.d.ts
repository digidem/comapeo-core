/// <reference types="node" />
import _m0 from "protobufjs/minimal.js";
export interface ProjectExtension {
    authCoreKeys: Buffer[];
    wantCoreKeys: Buffer[];
}
export declare const ProjectExtension: {
    encode(message: ProjectExtension, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ProjectExtension;
};
