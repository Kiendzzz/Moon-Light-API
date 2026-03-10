const { getStore } = require("@netlify/blobs");

const VALID_TYPES = ["fullmoon", "mirage", "rip_indra", "darkbeard", "soul_reaper", "dough_king"];
const TTL_MS = 10 * 60 * 1000; // 10 phút

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

exports.handler = async (event) => {
  // Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const store = getStore("blox-events");

  // POST - nhận job ID từ bot
  if (event.httpMethod === "POST") {
    try {
      const { type, job_id, token } = JSON.parse(event.body);

      if (token !== process.env.API_TOKEN) {
        return { statusCode: 403, headers, body: "Forbidden" };
      }
      if (!VALID_TYPES.includes(type) || !job_id) {
        return { statusCode: 400, headers, body: "Invalid request" };
      }

      // Lấy data hiện tại từ Blob store
      const now = Date.now();
      let data = {};
      try {
        const raw = await store.get(type);
        if (raw) data = JSON.parse(raw);
      } catch (_) {}

      // Thêm job_id mới + xóa job cũ hơn TTL
      data[job_id] = now;
      for (const [id, ts] of Object.entries(data)) {
        if (now - ts > TTL_MS) delete data[id];
      }

      // Lưu lại
      await store.set(type, JSON.stringify(data));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // GET - trả về danh sách job ID theo loại
  if (event.httpMethod === "GET") {
    const type = event.queryStringParameters?.type;

    if (!type || !VALID_TYPES.includes(type)) {
      return { statusCode: 400, headers, body: "Missing or invalid type" };
    }

    try {
      const now = Date.now();
      let data = {};
      const raw = await store.get(type);
      if (raw) data = JSON.parse(raw);

      // Lọc job hết hạn
      const servers = Object.entries(data)
        .filter(([_, ts]) => now - ts <= TTL_MS)
        .map(([id]) => id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(servers),
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: "Method Not Allowed" };
};
