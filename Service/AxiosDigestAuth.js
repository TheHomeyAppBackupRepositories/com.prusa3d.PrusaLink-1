"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AxiosDigestAuth = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const url = __importStar(require("url"));
class AxiosDigestAuth {
    constructor({ axios: axiosInst, password, username }) {
        this.axios = axiosInst ? axiosInst : axios_1.default.create();
        this.count = 0;
        this.password = password;
        this.username = username;
    }
    authError(error) {
        return !!(error.response?.status === 401 ||
            error.response?.headers['www-authenticate']);
    }
    async get(url, config) {
        return this.request({ url, method: 'GET', ...config });
    }
    async post(url, data, config) {
        return this.request({ url, method: 'GET', data, ...config });
    }
    async put(url, data, config) {
        return this.request({ url, method: 'PUT', data, ...config });
    }
    async delete(url, config) {
        return this.request({ url, method: 'DELETE', ...config });
    }
    async request(opts) {
        try {
            return await this.axios.request(opts);
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && !this.authError(error)) {
                throw error;
            }
            else if (axios_1.default.isAxiosError(error) && error.response) {
                const firstResponse = error.response;
                const authDetails = firstResponse.headers['www-authenticate']
                    .split(',')
                    .map((v) => v.split('='));
                if (!authDetails) {
                    throw new Error('authDetails is undefined');
                }
                ++this.count;
                const nonceCount = ('00000000' + this.count.toString()).slice(-8);
                const cnonce = crypto.randomBytes(24).toString('hex');
                const realmTmp = authDetails.find(el => el[0] && el[0].toLowerCase().indexOf('realm') > -1);
                const realm = realmTmp && realmTmp[1] ? realmTmp[1].replace(/"/g, '') : undefined;
                const nonceTmp = authDetails.find(el => el[0] && el[0].toLowerCase().indexOf('nonce') > -1);
                const nonce = nonceTmp && nonceTmp[1] ? nonceTmp[1].replace(/"/g, '') : undefined;
                if (!nonce || !realm) {
                    throw new Error('nonce or realm is undefined');
                }
                const ha1 = crypto
                    .createHash('md5')
                    .update(`${this.username}:${realm}:${this.password}`)
                    .digest('hex');
                if (!opts.url) {
                    throw new Error('opts.url is undefined');
                }
                const path = new url.URL(opts.url).pathname;
                if (!path) {
                    throw new Error('path is undefined');
                }
                const ha2 = crypto
                    .createHash('md5')
                    .update(`${opts.method ?? 'GET'}:${path}`)
                    .digest('hex');
                const response = crypto
                    .createHash('md5')
                    .update(`${ha1}:${nonce}:${ha2}`)
                    .digest('hex');
                const authorization = `Digest username="${this.username}", realm="${realm}", ` +
                    `nonce="${nonce}",uri="${path}", algorithm="MD5", ` +
                    `response="${response}"`;
                if (opts.headers) {
                    opts.headers['authorization'] = authorization;
                    //opts.headers['authorization'] = authorizationCustom;
                }
                else {
                    opts.headers = { authorization };
                }
                if (opts.auth) {
                    delete opts.auth;
                }
                return this.axios.request(opts);
            }
            throw error;
        }
    }
}
exports.AxiosDigestAuth = AxiosDigestAuth;
