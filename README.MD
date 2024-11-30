# Socket.IO implementation on Roblox

This is a full implementation of Socket.IO on Roblox.

> Because Roblox not support WebSocket, this implementation use HTTP long polling to communicate with server.

## Limit

### Roblox Limit 500 request per minute.

So this implementation will cache send packet and send request every 0.3 seconds.

you can see `src/engine.io-client/transports/polling-roblox.ts`

```ts
RunService.Heartbeat.Connect((dt) => {
	RobloxGlobalConfig.resetTime -= dt;
	if (RobloxGlobalConfig.resetTime < 0) {
		RobloxGlobalConfig.resetTime = RobloxGlobalConfig.REQUEST_TIMES_RESET_INTERVAL;
		RobloxGlobalConfig.requestTimes = 0;
	}
});
task.delay(0, () => {
	while (this.running) {
		this.flush();
		wait(0.3);
	}
});
```

### Roblox request timeout is 120 seconds.

So on Server side you can set pingInterval to `90000-110000`

```ts
import { createServer } from "http";
import { Server } from "socket.io";

const server = createServer();
const io = new Server(server, {
	pingInterval: 110000,
	cors: {
		origin: "*",
		credentials: true,
	},
});
```

> more long interval and send packet one time can reduce request times to prevent triggering restrictions.

You can config use RobloxGlobalConfig

```ts
// default config
export class RobloxGlobalConfig {
	/**
	 * Max request per minute
	 */
	public static MAX_REQUEST_PER_INTERVAL = 200;
	/**
	 * Interval to reset request times
	 */
	public static REQUEST_TIMES_RESET_INTERVAL = 60;
	/**
	 * Interval to flush packets
	 */
	public static FLUSH_PACKET_INTERVAL = 0.3;
}
// Modify config
RobloxGlobalConfig.MAX_REQUEST_PER_INTERVAL = 500;
RobloxGlobalConfig.FLUSH_PACKET_INTERVAL = 0.5;
```

## Installation

```sh
npm install @rbxts/socket.io
yarn add @rbxts/socket.io
pnpm add @rbxts/socket.io
```

## Usage

use example

```ts
import { io } from "@rbxts/socket.io";

const socket = io("http://localhost:3000");
socket.on("connect", () => {
	print("connected");
});
socket.on("disconnect", () => {
	print("disconnected");
});
socket.on("message", (message) => {
	print(message);
});
```

namespace support

```ts
import { io } from "@rbxts/socket.io";

const socket = io("http://localhost:3000");
socket.on("connect", () => {
	print("connected");
});
socket.on("disconnect", () => {
	print("disconnected");
});
socket.on("message", (message) => {
	print(message);
});
```
