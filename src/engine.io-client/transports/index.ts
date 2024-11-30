import { Transport } from '../transport';
import { Roblox } from './polling-roblox'

export const transports: { [key: string]: typeof Transport } = {
    "polling": Roblox,
};
