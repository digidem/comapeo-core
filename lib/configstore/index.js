import { DataStore } from "../datastore/index.js";

import { metadata, field, preset } from "./config-types.js";

export class ConfigStore {
    /** @type {DataStore} */
    #datastore

    /**
     * @param {Object} options
     * @param {Buffer} options.identityPublicKey the public key of the identity
     * @param {KeyPair} options.keyPair the local writer hypercore
     * @param {import('corestore')} options.corestore
     * @param {import('../sqlite.js').Sqlite} options.sqlite an instance of the internal Sqlite class
     */
    constructor(options) {
        this.#datastore = new DataStore({
            dataTypes: [
                metadata,
                field,
                preset
            ],
            ...options
        });
    }

    // query all config records of all types and return the big config object that we get in a mapeosettings file
    all(dataTypeName) {
        if (!dataTypeName) {
            // TODO: return full config object
        } else {
            // TODO: return config for a specific type
        }
    }

    // TODO: account for icon blobs in CRUD methods

    /**
     * @param {string} dataTypeName
     * @param {string} id
     * @returns {Promise<Doc>}
     * @throws {Error}
     */
    async get(dataTypeName, id) {
        return this.#datastore.get(dataTypeName, id);
    }

    /**
     * @param {string} dataTypeName
     * @param {Doc} data
     * @returns {Promise<Doc>}
     * @throws {Error}
     */
    async create(dataTypeName, data) {
        return this.#datastore.create(dataTypeName, data);
    }

    /**
    * @param {string} dataTypeName
    * @param {Doc} data
    * @returns {Promise<Doc>}
    * @throws {Error}
    */
    async update(dataTypeName, data) {
        return this.#datastore.update(dataTypeName, data);
    }

    /**
    * @param {string} dataTypeName
    * @param {string} id
    * @returns {Promise<Doc>}
    * @throws {Error}
    */
    async delete(dataTypeName, id) {
        // TODO: implement delete
        throw new Error("Not implemented");
    }
}
