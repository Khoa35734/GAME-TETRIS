import os from "os";
import fs from "fs";

function getLocalIPv4(): string | undefined {
  const network = os.networkInterfaces();
  for (const name of Object.keys(network)) {
    const interfaces = network[name];
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return undefined;
}

const address = getLocalIPv4();

if (address) {
  const content = `
VITE_APP_ENV=development
VITE_API_URL=http://${address}:4000/api
VITE_SOCKET_URL=http://${address}:4000
VITE_PUBLIC_PATH=/
VITE_STATIC_URL=http://${address}:4000/static
  `.trim();

  fs.writeFileSync(".env.local", content, { encoding: "utf8" });
  console.log(`✅ Updated .env.local with IP: ${address}`);
} else {
  console.error("❌ Không tìm thấy địa chỉ IP hợp lệ.");
}
