(() => {
  const BLOCKS = [
    null,
    [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9]],
    [[1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16]],
    [[1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13]],
    [[1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9]],
    [[1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12]],
    [[2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15]],
    [[2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14]],
    [[2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15]],
    [[2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13]],
    [[2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]],
  ];
  const ALIGN = [
    [],
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
  ];

  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (() => {
    let value = 1;
    for (let i = 0; i < 255; i += 1) {
      EXP[i] = value;
      LOG[value] = i;
      value <<= 1;
      if (value & 0x100) value ^= 0x11d;
    }
    for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
  })();
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  const rsGenerator = (degree) => {
    let poly = [1];
    for (let i = 0; i < degree; i += 1) {
      const next = new Array(poly.length + 1).fill(0);
      poly.forEach((coef, index) => {
        next[index] ^= coef;
        next[index + 1] ^= mul(coef, EXP[i]);
      });
      poly = next;
    }
    return poly;
  };
  const rsRemainder = (data, degree) => {
    const gen = rsGenerator(degree);
    const result = data.concat(new Array(degree).fill(0));
    for (let i = 0; i < data.length; i += 1) {
      const coef = result[i];
      if (!coef) continue;
      gen.forEach((part, index) => {
        result[i + index] ^= mul(part, coef);
      });
    }
    return result.slice(data.length);
  };

  const groupsOf = (version) => {
    const raw = BLOCKS[version][1];
    const groups = [];
    for (let i = 0; i < raw.length; i += 3) {
      groups.push({ count: raw[i], total: raw[i + 1], data: raw[i + 2] });
    }
    return groups;
  };
  const dataCount = (version) => groupsOf(version).reduce((sum, group) => sum + group.count * group.data, 0);

  const pack = (text, version) => {
    const bytes = new TextEncoder().encode(text);
    const countBits = version < 10 ? 8 : 16;
    const bits = [];
    const push = (value, length) => {
      for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
    };
    push(0b0100, 4);
    push(bytes.length, countBits);
    bytes.forEach((part) => push(part, 8));
    const capacity = dataCount(version) * 8;
    push(0, Math.min(4, Math.max(0, capacity - bits.length)));
    while (bits.length % 8) bits.push(0);
    const out = [];
    for (let i = 0; i < bits.length; i += 8) {
      let value = 0;
      for (let j = 0; j < 8; j += 1) value = (value << 1) | bits[i + j];
      out.push(value);
    }
    const pads = [0xec, 0x11];
    let pad = 0;
    while (out.length < dataCount(version)) {
      out.push(pads[pad % 2]);
      pad += 1;
    }
    return out;
  };

  const codewords = (data, version) => {
    const groups = groupsOf(version);
    const blocks = [];
    let offset = 0;
    groups.forEach((group) => {
      for (let i = 0; i < group.count; i += 1) {
        const part = data.slice(offset, offset + group.data);
        offset += group.data;
        blocks.push({ data: part, ecc: rsRemainder(part, group.total - group.data) });
      }
    });
    const out = [];
    const maxData = Math.max(...blocks.map((block) => block.data.length));
    for (let i = 0; i < maxData; i += 1) {
      blocks.forEach((block) => {
        if (i < block.data.length) out.push(block.data[i]);
      });
    }
    const maxEcc = Math.max(...blocks.map((block) => block.ecc.length));
    for (let i = 0; i < maxEcc; i += 1) {
      blocks.forEach((block) => {
        if (i < block.ecc.length) out.push(block.ecc[i]);
      });
    }
    return out;
  };

  const blank = (size) => ({
    matrix: Array.from({ length: size }, () => new Array(size).fill(0)),
    reserved: Array.from({ length: size }, () => new Array(size).fill(0)),
  });

  const finder = (board, ox, oy) => {
    const n = board.matrix.length;
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const xx = ox + x;
        const yy = oy + y;
        if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
        const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        const dark = inside && (x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
        board.matrix[yy][xx] = dark ? 1 : 0;
        board.reserved[yy][xx] = 1;
      }
    }
  };

  const alignment = (board, cx, cy) => {
    for (let y = -2; y <= 2; y += 1) {
      for (let x = -2; x <= 2; x += 1) {
        board.matrix[cy + y][cx + x] = Math.max(Math.abs(x), Math.abs(y)) === 1 ? 0 : 1;
        board.reserved[cy + y][cx + x] = 1;
      }
    }
  };

  const functionPatterns = (version) => {
    const n = version * 4 + 17;
    const board = blank(n);
    finder(board, 0, 0);
    finder(board, n - 7, 0);
    finder(board, 0, n - 7);
    for (let i = 8; i < n - 8; i += 1) {
      const dark = i % 2 === 0 ? 1 : 0;
      if (!board.reserved[6][i]) {
        board.matrix[6][i] = dark;
        board.reserved[6][i] = 1;
      }
      if (!board.reserved[i][6]) {
        board.matrix[i][6] = dark;
        board.reserved[i][6] = 1;
      }
    }
    ALIGN[version].forEach((cy) => {
      ALIGN[version].forEach((cx) => {
        if (board.reserved[cy][cx]) return;
        alignment(board, cx, cy);
      });
    });
    board.matrix[n - 8][8] = 1;
    board.reserved[n - 8][8] = 1;
    for (let i = 0; i < 9; i += 1) {
      board.reserved[8][i] = 1;
      board.reserved[i][8] = 1;
    }
    for (let i = 0; i < 8; i += 1) {
      board.reserved[8][n - 1 - i] = 1;
      board.reserved[n - 1 - i][8] = 1;
    }
    if (version >= 7) {
      for (let i = 0; i < 6; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          board.reserved[j][n - 11 + i] = 1;
          board.reserved[n - 11 + i][j] = 1;
        }
      }
    }
    return board;
  };

  const placeData = (board, words) => {
    const n = board.matrix.length;
    const bits = [];
    words.forEach((word) => {
      for (let i = 7; i >= 0; i -= 1) bits.push((word >>> i) & 1);
    });
    let index = 0;
    let upward = true;
    for (let col = n - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      for (let step = 0; step < n; step += 1) {
        const row = upward ? n - 1 - step : step;
        [0, 1].forEach((shift) => {
          const x = col - shift;
          if (board.reserved[row][x]) return;
          board.matrix[row][x] = index < bits.length ? bits[index] : 0;
          index += 1;
        });
      }
      upward = !upward;
    }
  };

  const formatBits = (mask) => {
    let rem = mask << 10;
    for (let i = 14; i >= 10; i -= 1) {
      if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
    }
    return ((mask << 10) | rem) ^ 0x5412;
  };

  const drawFormat = (board, mask) => {
    const bits = formatBits(mask);
    const n = board.matrix.length;
    const orderA = [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8], [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0]];
    orderA.forEach(([x, y], index) => {
      board.matrix[y][x] = (bits >>> (14 - index)) & 1;
    });
    for (let i = 0; i < 8; i += 1) board.matrix[8][n - 1 - i] = (bits >>> (14 - i)) & 1;
    for (let i = 0; i < 7; i += 1) board.matrix[n - 7 + i][8] = (bits >>> (6 - i)) & 1;
  };

  const drawVersion = (board, version) => {
    if (version < 7) return;
    let rem = version << 12;
    for (let i = 17; i >= 12; i -= 1) {
      if ((rem >>> i) & 1) rem ^= 0x1f25 << (i - 12);
    }
    const bits = (version << 12) | rem;
    const n = board.matrix.length;
    for (let i = 0; i < 18; i += 1) {
      const bit = (bits >>> i) & 1;
      const a = Math.floor(i / 3);
      const b = i % 3;
      board.matrix[b][n - 11 + a] = bit;
      board.matrix[n - 11 + a][b] = bit;
    }
  };

  const applyMask = (board, mask) => {
    const n = board.matrix.length;
    const copy = board.matrix.map((row) => row.slice());
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (board.reserved[y][x]) continue;
        let flip = false;
        if (mask === 0) flip = (x + y) % 2 === 0;
        if (mask === 1) flip = y % 2 === 0;
        if (mask === 2) flip = x % 3 === 0;
        if (mask === 3) flip = (x + y) % 3 === 0;
        if (mask === 4) flip = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
        if (mask === 5) flip = ((x * y) % 2) + ((x * y) % 3) === 0;
        if (mask === 6) flip = ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0;
        if (mask === 7) flip = ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0;
        if (flip) copy[y][x] ^= 1;
      }
    }
    return copy;
  };

  const penalty = (matrix) => {
    const n = matrix.length;
    let score = 0;
    const run = (get) => {
      for (let a = 0; a < n; a += 1) {
        let last = -1;
        let count = 0;
        for (let b = 0; b < n; b += 1) {
          const bit = get(a, b);
          if (bit === last) count += 1;
          else {
            if (count >= 5) score += 3 + count - 5;
            last = bit;
            count = 1;
          }
        }
        if (count >= 5) score += 3 + count - 5;
      }
    };
    run((row, col) => matrix[row][col]);
    run((col, row) => matrix[row][col]);
    for (let y = 0; y < n - 1; y += 1) {
      for (let x = 0; x < n - 1; x += 1) {
        const bit = matrix[y][x];
        if (bit === matrix[y][x + 1] && bit === matrix[y + 1][x] && bit === matrix[y + 1][x + 1]) score += 3;
      }
    }
    const pattern = (line) => {
      const text = line.join("");
      const a = "10111010000";
      const b = "00001011101";
      for (let i = 0; i <= text.length - 11; i += 1) {
        const part = text.slice(i, i + 11);
        if (part === a || part === b) score += 40;
      }
    };
    for (let y = 0; y < n; y += 1) pattern(matrix[y]);
    for (let x = 0; x < n; x += 1) pattern(matrix.map((row) => row[x]));
    const dark = matrix.flat().reduce((sum, bit) => sum + bit, 0);
    score += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
    return score;
  };

  const matrixFor = (text) => {
    const bytes = new TextEncoder().encode(text).length;
    let version = 0;
    for (let next = 1; next <= 10; next += 1) {
      const countBits = next < 10 ? 8 : 16;
      if (dataCount(next) * 8 >= 4 + countBits + bytes * 8) {
        version = next;
        break;
      }
    }
    if (!version) throw new Error("Der Code passt in keinen QR-Code.");
    const board = functionPatterns(version);
    placeData(board, codewords(pack(text, version), version));
    drawVersion(board, version);
    let best = null;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask += 1) {
      const matrix = applyMask(board, mask);
      drawFormat({ matrix, reserved: board.reserved }, mask);
      const score = penalty(matrix);
      if (score < bestScore) {
        best = matrix;
        bestScore = score;
      }
    }
    return best;
  };

  const zeichne = (canvas, text) => {
    const matrix = matrixFor(text);
    const quiet = 4;
    const scale = 4;
    const size = (matrix.length + quiet * 2) * scale;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f6f1e7";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#171512";
    matrix.forEach((row, y) => {
      row.forEach((bit, x) => {
        if (!bit) return;
        ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      });
    });
  };

  window.BauQr = { zeichne, matrixFor };
})();
