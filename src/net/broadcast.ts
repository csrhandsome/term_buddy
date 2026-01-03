import os from "node:os";

function ipv4ToInt(ip: string) {
  return ip
    .split(".")
    .map((n) => Number.parseInt(n, 10))
    .reduce((acc, n) => ((acc << 8) | (n & 255)) >>> 0, 0);
}

function intToIpv4(n: number) {
  return [24, 16, 8, 0].map((shift) => String((n >>> shift) & 255)).join(".");
}

export function getBroadcastTargets(): string[] {
  const out = new Set<string>(["255.255.255.255"]);

  const ifaces = os.networkInterfaces();
  for (const entries of Object.values(ifaces)) {
    if (!entries) continue;
    for (const e of entries) {
      if (e.family !== "IPv4") continue;
      if (e.internal) continue;
      if (!e.address || !e.netmask) continue;
      const ip = ipv4ToInt(e.address);
      const mask = ipv4ToInt(e.netmask);
      const broadcast = (ip | (~mask >>> 0)) >>> 0;
      out.add(intToIpv4(broadcast));
    }
  }

  return [...out];
}
