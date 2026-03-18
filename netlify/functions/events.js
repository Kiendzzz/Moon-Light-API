// Lưu trữ tạm thời trong memory (sẽ mất khi function ngủ, nhưng đủ dùng)
let events = {
  fullmoon: new Map(),
  mirage: new Map(),
  rip_indra: new Map(),
  darkbeard: new Map(),
  soul_reaper: new Map(),
  dough_king: new Map()
};

const API_TOKEN = process.env.API_TOKEN || 'MoonLightAPI1234@#';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // POST - nhận job ID từ bot
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

      // Xóa job cũ hơn 10 phút
      const now = Date.now();
      for (const [id, ts] of events[type]) {
        if (now - ts > 10 * 60 * 1000) events[type].delete(id);
      }

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
        body: JSON.stringify({ error: 'Missing or invalid type. Valid: fullmoon, mirage, rip_indra, darkbeard, soul_reaper, dough_king' }),
      };
    }

    // Xóa job cũ hơn 10 phút trước khi trả về
    const now = Date.now();
    for (const [id, ts] of events[type]) {
      if (now - ts > 10 * 60 * 1000) events[type].delete(id);
    }

    const servers = Array.from(events[type].keys());
    console.log(`✅ [GET] type=${type} | count=${servers.length}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(servers),
    };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
