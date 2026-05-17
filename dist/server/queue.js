"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRenderQueue = exports.getRedisConnection = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
let _connection = null;
function getRedisConnection() {
    if (!_connection) {
        _connection = new ioredis_1.default((0, env_1.env)().REDIS_URL, {
            maxRetriesPerRequest: null, // Required by BullMQ
        });
    }
    return _connection;
}
exports.getRedisConnection = getRedisConnection;
let _queue = null;
function getRenderQueue() {
    if (!_queue) {
        _queue = new bullmq_1.Queue("render", {
            connection: getRedisConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
            },
        });
    }
    return _queue;
}
exports.getRenderQueue = getRenderQueue;
