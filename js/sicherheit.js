(() => {
  const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
  const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;
  const concat = (a, b) => {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  };
  const bytesOf = (text) => new TextEncoder().encode(String(text));

  const sha1 = (bytes) => {
    const bitLen = bytes.length * 8;
    const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    new DataView(padded.buffer).setUint32(padded.length - 4, bitLen >>> 0, false);
    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;
    const w = new Uint32Array(80);
    const view = new DataView(padded.buffer);
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let t = 0; t < 16; t += 1) w[t] = view.getUint32(offset + t * 4, false);
      for (let t = 16; t < 80; t += 1) w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      for (let t = 0; t < 80; t += 1) {
        let f;
        let k;
        if (t < 20) {
          f = (b & c) | (~b & d);
          k = 0x5a827999;
        } else if (t < 40) {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        } else if (t < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }
        const temp = (rotl(a, 5) + f + e + k + w[t]) >>> 0;
        e = d;
        d = c;
        c = rotl(b, 30);
        b = a;
        a = temp;
      }
      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
    }
    const out = new Uint8Array(20);
    const target = new DataView(out.buffer);
    [h0, h1, h2, h3, h4].forEach((value, index) => target.setUint32(index * 4, value, false));
    return out;
  };

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const sha256 = (bytes) => {
    const bitLen = bytes.length * 8;
    const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    new DataView(padded.buffer).setUint32(padded.length - 4, bitLen >>> 0, false);
    let h0 = 0x6a09e667;
    let h1 = 0xbb67ae85;
    let h2 = 0x3c6ef372;
    let h3 = 0xa54ff53a;
    let h4 = 0x510e527f;
    let h5 = 0x9b05688c;
    let h6 = 0x1f83d9ab;
    let h7 = 0x5be0cd19;
    const w = new Uint32Array(64);
    const view = new DataView(padded.buffer);
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let t = 0; t < 16; t += 1) w[t] = view.getUint32(offset + t * 4, false);
      for (let t = 16; t < 64; t += 1) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      let f = h5;
      let g = h6;
      let h = h7;
      for (let t = 0; t < 64; t += 1) {
        const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = ((e & f) ^ (~e & g)) >>> 0;
        const t1 = (h + s1 + ch + K[t] + w[t]) >>> 0;
        const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const t2 = (s0 + maj) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + t1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) >>> 0;
      }
      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
      h5 = (h5 + f) >>> 0;
      h6 = (h6 + g) >>> 0;
      h7 = (h7 + h) >>> 0;
    }
    const out = new Uint8Array(32);
    const target = new DataView(out.buffer);
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach((value, index) => target.setUint32(index * 4, value, false));
    return out;
  };

  const hmac = (hash, block, key, message) => {
    let used = key;
    if (used.length > block) used = hash(used);
    const inner = new Uint8Array(block);
    const outer = new Uint8Array(block);
    inner.set(used);
    outer.set(used);
    for (let i = 0; i < block; i += 1) {
      inner[i] ^= 0x36;
      outer[i] ^= 0x5c;
    }
    return hash(concat(outer, hash(concat(inner, message))));
  };

  const hex = (bytes) => [...bytes].map((part) => part.toString(16).padStart(2, "0")).join("");
  const gleich = (left, right) => {
    const a = String(left);
    const b = String(right);
    let diff = a.length ^ b.length;
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };

  const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
  const b64decode = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

  const pbkdf2 = async (password, salt, iterations, length) => {
    const pass = bytesOf(password);
    const blocks = Math.ceil(length / 32);
    const out = new Uint8Array(blocks * 32);
    for (let block = 1; block <= blocks; block += 1) {
      const tail = new Uint8Array(4);
      new DataView(tail.buffer).setUint32(0, block, false);
      let u = hmac(sha256, 64, pass, concat(salt, tail));
      const t = u.slice();
      for (let i = 1; i < iterations; i += 1) {
        u = hmac(sha256, 64, pass, u);
        for (let j = 0; j < t.length; j += 1) t[j] ^= u[j];
        if (i % 400 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      out.set(t, (block - 1) * 32);
    }
    return out.slice(0, length);
  };

  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const base32 = (bytes) => {
    let value = 0;
    let bits = 0;
    let out = "";
    bytes.forEach((part) => {
      value = (value << 8) | part;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        out += ABC[(value >>> bits) & 31];
      }
    });
    if (bits) out += ABC[(value << (5 - bits)) & 31];
    return out;
  };
  const base32decode = (text) => {
    let value = 0;
    let bits = 0;
    const out = [];
    String(text || "")
      .toUpperCase()
      .replace(/=+$/g, "")
      .split("")
      .forEach((char) => {
        const index = ABC.indexOf(char);
        if (index < 0) return;
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
          bits -= 8;
          out.push((value >>> bits) & 255);
        }
      });
    return Uint8Array.from(out);
  };

  const zufall = (length) => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  };

  const totp = (secret, zeit = Date.now(), step = 30) => {
    const counter = Math.floor(zeit / 1000 / step);
    const msg = new Uint8Array(8);
    let rest = counter;
    for (let i = 7; i >= 0; i -= 1) {
      msg[i] = rest & 255;
      rest = Math.floor(rest / 256);
    }
    const mac = hmac(sha1, 64, base32decode(secret), msg);
    const offset = mac[mac.length - 1] & 15;
    const bin =
      ((mac[offset] & 127) << 24) |
      (mac[offset + 1] << 16) |
      (mac[offset + 2] << 8) |
      mac[offset + 3];
    return String(bin % 1000000).padStart(6, "0");
  };

  const totpPasst = (secret, code, zeit = Date.now()) => {
    const eingabe = String(code || "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(eingabe)) return false;
    let treffer = false;
    [-1, 0, 1].forEach((slot) => {
      treffer = treffer || gleich(totp(secret, zeit + slot * 30000), eingabe);
    });
    return treffer;
  };

  const neuesGeheimnis = () => base32(zufall(20));
  const codeText = () => {
    const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
    const bytes = zufall(10);
    const raw = [...bytes].map((part) => alphabet[part % alphabet.length]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  };
  const codeHash = (text) => hex(sha256(bytesOf(`bau-rominia-code:${String(text).toLowerCase().replace(/[\s-]/g, "")}`)));
  const neueCodes = () => Array.from({ length: 8 }, () => {
    const text = codeText();
    return { text, hash: codeHash(text) };
  });

  const selbsttest = () => {
    const sha1abc = hex(sha1(bytesOf("abc")));
    const sha256abc = hex(sha256(bytesOf("abc")));
    const probe = totp(base32(bytesOf("12345678901234567890")), 59000);
    return {
      sha1: sha1abc === "a9993e364706816aba3e25717850c26c9cd0d89d",
      sha256: sha256abc === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      totp: probe === "287082",
    };
  };

  window.BauSicherheit = {
    sha256,
    hex,
    gleich,
    b64,
    b64decode,
    pbkdf2,
    base32,
    zufall,
    totp,
    totpPasst,
    neuesGeheimnis,
    neueCodes,
    codeHash,
    selbsttest,
  };
})();
