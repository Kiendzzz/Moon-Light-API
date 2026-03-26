// netlify/functions/events.js
let events = {
  fullmoon: new Map(),
  mirage: new Map(),
  rip_indra: new Map(),
  darkbeard: new Map(),
  soul_reaper: new Map(),
  dough_king: new Map(),
  cursed_captain: new Map(),  
  prehistoric: new Map(),
  shizu: new Map(),
  saishi: new Map(),
  oroshi: new Map(),
  snow_white: new Map(),
  pure_red: new Map(),
  winter_sky: new Map()
};

const API_TOKEN = process.env.API_TOKEN || 'MoonLightAPI1234@#';
const TTL_MS = 30 * 60 * 1000; // 30 phút

// Hàm dọn dẹp các job cũ
function cleanup(type) {
  const now = Date.now();
  for (const [id, ts] of events[type]) {
    if (now - ts > TTL_MS) events[type].delete(id);
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // POST - nhận job ID
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { type, job_id, token } = body;
      const validTypes = Object.keys(events);

      // Kiểm tra token
      if (token !== API_TOKEN) {
        console.log(`❌ Token sai: nhận "${token}", cần "${API_TOKEN}"`);
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: invalid token' }) };
      }
      if (!type || !validTypes.includes(type)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or missing type' }) };
      }
      if (!job_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing job_id' }) };
      }

      // Lưu job ID kèm timestamp
      events[type].set(job_id, Date.now());

      // Dọn dẹp các job cũ
      cleanup(type);

      console.log(`✅ [POST] type=${type} | job_id=${job_id}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, type, job_id }),
      };
    } catch (e) {
      console.error('❌ POST error:', e.message);
      return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // GET - trả về danh sách job ID theo loại
  if (event.httpMethod === 'GET') {
    const type = event.queryStringParameters?.type;

    if (!type || !events[type]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid type. Valid: fullmoon, mirage, rip_indra, darkbeard, soul_reaper, dough_king, cursed_captain, prehistoric, shizu, saishi, oroshi, snow_white, pure_red, winter_sky' }),
      };
    }

    // Dọn dẹp trước khi trả về
    cleanup(type);

    const servers = Array.from(events[type].keys());
    console.log(`✅ [GET] type=${type} | count=${servers.length}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(servers),
    };
  }

  // DELETE - xóa job ID cụ thể
  if (event.httpMethod === 'DELETE') {
    try {
      const { type, job_id, token } = event.queryStringParameters || {};
      const validTypes = Object.keys(events);

      if (token !== API_TOKEN) {
        console.log(`❌ Token sai khi DELETE`);
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: invalid token' }) };
      }
      if (!type || !validTypes.includes(type)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or missing type' }) };
      }
      if (!job_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing job_id' }) };
      }

      const deleted = events[type].delete(job_id);
      console.log(`🗑️ [DELETE] type=${type} | job_id=${job_id} | ${deleted ? 'deleted' : 'not found'}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, deleted, type, job_id }),
      };
    } catch (e) {
      console.error('❌ DELETE error:', e.message);
      return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
